import { Product } from "../models/product.model.js";
import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            minPrice,
            maxPrice,
            search,
            sortBy = "createdAt",
            sortOrder = "desc",
            featured
        } = req.query;

        const filter = { isActive: true };

        if (category && category !== "all") {
            filter.category = category;
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        if (search) {
            filter.$text = { $search: search };
        }

        if (featured === "true") {
            filter.isFeatured = true;
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

        const products = await Product.find(filter)
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const total = await Product.countDocuments(filter);

        res.json({
            products,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error("Get products error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("reviews.user", "name");

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        console.error("Get product error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const createProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category,
            brand,
            stock,
            specifications,
            tags,
            isFeatured
        } = req.body;

        let images = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path);
                images.push(result.secure_url);
            }
        }

        const product = await Product.create({
            name,
            description,
            price,
            images,
            category,
            brand,
            stock,
            specifications,
            tags,
            isFeatured
        });

        res.status(201).json(product);
    } catch (error) {
        console.error("Create product error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        // Clear cache
        await redis.del(`product:${req.params.id}`);

        res.json(updatedProduct);
    } catch (error) {
        console.error("Update product error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await Product.findByIdAndDelete(req.params.id);

        // Clear cache
        await redis.del(`product:${req.params.id}`);

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Delete product error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const addReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const alreadyReviewed = product.reviews.find(
            review => review.user.toString() === req.user._id.toString()
        );

        if (alreadyReviewed) {
            return res.status(400).json({ message: "Product already reviewed" });
        }

        const review = {
            user: req.user._id,
            rating: Number(rating),
            comment
        };

        product.reviews.push(review);
        product.ratings.count = product.reviews.length;
        product.ratings.average =
            product.reviews.reduce((acc, review) => review.rating + acc, 0) /
            product.reviews.length;

        await product.save();

        res.status(201).json({ message: "Review added successfully" });
    } catch (error) {
        console.error("Add review error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getFeaturedProducts = async (req, res) => {
    try {
        let featuredProducts = await redis.get("featured_products");

        if (featuredProducts) {
            return res.json(JSON.parse(featuredProducts));
        }

        featuredProducts = await Product.find({ isFeatured: true, isActive: true })
            .limit(6)
            .lean();

        if (!featuredProducts || featuredProducts.length === 0) {
            return res.status(404).json({ message: "No featured products found" });
        }

        await redis.setex("featured_products", 3600, JSON.stringify(featuredProducts));

        res.json(featuredProducts);
    } catch (error) {
        console.error("Get featured products error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getRecommendedProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([
            {
                $sample: { size: 4 }
            },
            {
                $match: { isActive: true }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    images: 1,
                    price: 1,
                    category: 1,
                    ratings: 1
                }
            }
        ]);

        res.json(products);
    } catch (error) {
        console.error("Get recommended products error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Product.find({ category, isActive: true });
        res.json({ products });
    } catch (error) {
        console.error("Get products by category error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const toggleFeaturedProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        product.isFeatured = !product.isFeatured;
        const updatedProduct = await product.save();

        await redis.del("featured_products");

        res.json(updatedProduct);
    } catch (error) {
        console.error("Toggle featured product error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};