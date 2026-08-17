const DashboardController = {
  getStats: function() {
    const customers = CustomerController.getCustomers();
    const orders = OrderController.getOrders();
    const inventory = InventoryController.getInventory();
    const expenses = ExpenseController.getExpenses();

    let total_sales = 0;
    let total_paid = 0;
    let total_remaining = 0;
    let active_tailoring = 0;

    orders.forEach(o => {
      total_sales += parseFloat(o.total) || 0;
      total_paid += parseFloat(o.paid) || 0;
      total_remaining += parseFloat(o.remaining) || 0;
      
      const statusStr = (o.status || "").toLowerCase();
      if (statusStr.includes('خياطة') || statusStr.includes('قص') || statusStr.includes('تطريز')) {
        active_tailoring++;
      }
    });

    let low_stock_alerts = 0;
    inventory.forEach(i => {
      if (parseFloat(i.qty) <= parseFloat(i.min_alert)) {
        low_stock_alerts++;
      }
    });

    let total_expenses = 0;
    expenses.forEach(e => {
      total_expenses += parseFloat(e.amount) || 0;
    });

    // Dummy values for unimplemented features that were requested in requirements
    let total_purchases = 0; 
    let total_inventory = inventory.length;

    const net_profit = total_sales - (total_expenses + total_purchases);

    return {
      total_customers: customers.length,
      total_orders: orders.length,
      total_sales: total_sales,
      total_paid: total_paid,
      total_remaining: total_remaining,
      low_stock_alerts: low_stock_alerts,
      active_tailoring: active_tailoring,
      total_expenses: total_expenses,
      total_purchases: total_purchases,
      total_inventory: total_inventory,
      net_profit: net_profit
    };
  }
};
