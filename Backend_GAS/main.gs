/**
 * Handles GET requests (for testing or lightweight fetching)
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * Handles POST requests (for data submission and fetching)
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * Core request router
 */
function handleRequest(e) {
  try {
    let params = {};
    
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else {
      params = e.parameter || {};
    }

    const action = params.action;
    const data = params.data || {};

    let result = { success: false, message: "Unknown action" };

    switch (action) {
      case 'addCustomer': result = CustomerController.addCustomer(data); break;
      case 'getCustomers': result = { success: true, data: CustomerController.getCustomers() }; break;

      case 'addOrder':
      case 'createInvoice': result = OrderController.addOrder(data); break;
      case 'getOrders': result = { success: true, data: OrderController.getOrders() }; break;

      case 'addInventory': result = InventoryController.addInventory(data); break;
      case 'getInventory': result = { success: true, data: InventoryController.getInventory() }; break;

      case 'addAccount': result = AccountingController.addAccount(data); break;
      case 'getAccounts': result = { success: true, data: AccountingController.getAccounts() }; break;

      case 'addVoucher': result = VoucherController.addVoucher(data); break;
      case 'getVouchers': result = { success: true, data: VoucherController.getVouchers() }; break;

      case 'addPurchase': result = { success: false, message: "Purchase add not implemented" }; break;
      case 'getPurchases': result = { success: true, data: [] }; break; // Placeholder

      case 'addExpense': result = ExpenseController.addExpense(data); break;
      case 'getExpenses': result = { success: true, data: ExpenseController.getExpenses() }; break;

      case 'updateFactory': result = FactoryController.updateFactory(data); break;
      case 'getFactory': result = { success: true, data: FactoryController.getFactory() }; break;

      case 'addJournalEntry': result = JournalController.addJournalEntry(data); break;
      case 'getJournalEntries': result = { success: true, data: JournalController.getJournalEntries() }; break;
      case 'addMarketingCampaign': result = MarketingController.addCampaign(data); break;
      case 'getMarketingCampaigns': result = { success: true, data: MarketingController.getCampaigns() }; break;

      case 'getDashboardStats': result = { success: true, data: DashboardController.getStats() }; break;

      default:
        result = { success: false, message: "Action not supported: " + action };
    }
    
    return responseJSON(result);

  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}
