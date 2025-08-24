import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";

export const getAnalyticsData = async (req, res) => {
  try {
    const analyticsData = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalPrice" },
            avgOrderValue: { $avg: "$totalPrice" }
          }
        }
      ])
    ]);

    const [totalUsers, totalProducts, totalOrders, revenueData] = analyticsData;

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const avgOrderValue = revenueData[0]?.avgOrderValue || 0;

    const dailyOrdersData = await getDailyOrdersData();

    res.json({
      users: totalUsers,
      products: totalProducts,
      orders: totalOrders,
      revenue: totalRevenue.toFixed(2),
      avgOrderValue: avgOrderValue.toFixed(2),
      dailyOrdersData
    });
  } catch (error) {
    console.error("Get analytics data error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const getDailyOrdersData = async () => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    const dailyOrdersData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalPrice" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dateArray = getDateArray(startDate, endDate);

    return dateArray.map(date => {
      const foundData = dailyOrdersData.find(item => item._id === date);
      return {
        date,
        orders: foundData?.orders || 0,
        revenue: foundData?.revenue || 0
      };
    });
  } catch (error) {
    console.error("Get daily orders data error:", error.message);
    throw error;
  }
};

const getDateArray = (start, end) => {
  const arr = [];
  const dt = new Date(start);
  while (dt <= end) {
    arr.push(dt.toISOString().split("T")[0]);
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
};
