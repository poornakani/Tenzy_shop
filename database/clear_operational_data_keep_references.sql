/*
    Tenzy shop database reset

    Purpose:
      Clear live operational data so the admin flow can start again from:
      UK Purchase -> Dispatch -> Arrival -> Pricing -> Products

    Preserved reference/login tables:
      dbo.Brand
      dbo.Category
      dbo.ConcernTypes
      dbo.ConcernTypeCategories
      dbo.PaymentType
      dbo.SupplyShops
      dbo.Users
      dbo.UserRoles
      dbo.PasswordCredentials
      dbo.RefreshSessions
      dbo.PasswordResetTokens

    Cleared data:
      Supply-chain rows, products, product child rows, orders, reviews,
      old procurement/dispatch rows, deleted item logs, admin audit logs,
      and login history.

    Run this on SQL Server against the Tenzy database.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRAN;

    -- Temporarily disable FK checks for the selected operational tables.
    IF OBJECT_ID('dbo.SupplyPricing', 'U') IS NOT NULL ALTER TABLE dbo.SupplyPricing NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyArrivalItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyArrivalItems NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyArrivalVerifications', 'U') IS NOT NULL ALTER TABLE dbo.SupplyArrivalVerifications NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipmentCharges', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipmentCharges NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipmentItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipmentItems NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipments', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipments NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementCardCharges', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementCardCharges NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementDiscountAllocations', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementDiscountAllocations NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementDiscounts', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementDiscounts NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementItems NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurements', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurements NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL ALTER TABLE dbo.SupplyDeletedItemsLog NOCHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL ALTER TABLE dbo.Dispatch NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProcurementItems', 'U') IS NOT NULL ALTER TABLE dbo.ProcurementItems NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProcurementOrders', 'U') IS NOT NULL ALTER TABLE dbo.ProcurementOrders NOCHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL ALTER TABLE dbo.OrderItems NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL ALTER TABLE dbo.Orders NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductReviews', 'U') IS NOT NULL ALTER TABLE dbo.ProductReviews NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL ALTER TABLE dbo.ProductPaymentOptions NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL ALTER TABLE dbo.ProductConcerns NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL ALTER TABLE dbo.ProductFAQ NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL ALTER TABLE dbo.ProductImages NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL ALTER TABLE dbo.ProductPricing NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL ALTER TABLE dbo.ProductInventory NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL ALTER TABLE dbo.ProductCatalog NOCHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.AdminAuditLog', 'U') IS NOT NULL ALTER TABLE dbo.AdminAuditLog NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.UserLoginHistory', 'U') IS NOT NULL ALTER TABLE dbo.UserLoginHistory NOCHECK CONSTRAINT ALL;

    -- Delete child rows before parent rows where possible.
    IF OBJECT_ID('dbo.SupplyPricing', 'U') IS NOT NULL DELETE FROM dbo.SupplyPricing;
    IF OBJECT_ID('dbo.SupplyArrivalItems', 'U') IS NOT NULL DELETE FROM dbo.SupplyArrivalItems;
    IF OBJECT_ID('dbo.SupplyArrivalVerifications', 'U') IS NOT NULL DELETE FROM dbo.SupplyArrivalVerifications;
    IF OBJECT_ID('dbo.SupplyShipmentCharges', 'U') IS NOT NULL DELETE FROM dbo.SupplyShipmentCharges;
    IF OBJECT_ID('dbo.SupplyShipmentItems', 'U') IS NOT NULL DELETE FROM dbo.SupplyShipmentItems;
    IF OBJECT_ID('dbo.SupplyShipments', 'U') IS NOT NULL DELETE FROM dbo.SupplyShipments;
    IF OBJECT_ID('dbo.SupplyProcurementCardCharges', 'U') IS NOT NULL DELETE FROM dbo.SupplyProcurementCardCharges;
    IF OBJECT_ID('dbo.SupplyProcurementDiscountAllocations', 'U') IS NOT NULL DELETE FROM dbo.SupplyProcurementDiscountAllocations;
    IF OBJECT_ID('dbo.SupplyProcurementDiscounts', 'U') IS NOT NULL DELETE FROM dbo.SupplyProcurementDiscounts;
    IF OBJECT_ID('dbo.SupplyProcurementItems', 'U') IS NOT NULL DELETE FROM dbo.SupplyProcurementItems;
    IF OBJECT_ID('dbo.SupplyProcurements', 'U') IS NOT NULL DELETE FROM dbo.SupplyProcurements;
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL DELETE FROM dbo.SupplyDeletedItemsLog;

    -- Older/simple procurement and order dispatch tables, if still present.
    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL DELETE FROM dbo.Dispatch;
    IF OBJECT_ID('dbo.ProcurementItems', 'U') IS NOT NULL DELETE FROM dbo.ProcurementItems;
    IF OBJECT_ID('dbo.ProcurementOrders', 'U') IS NOT NULL DELETE FROM dbo.ProcurementOrders;

    IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL DELETE FROM dbo.OrderItems;
    IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DELETE FROM dbo.Orders;
    IF OBJECT_ID('dbo.ProductReviews', 'U') IS NOT NULL DELETE FROM dbo.ProductReviews;
    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL DELETE FROM dbo.ProductPaymentOptions;
    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL DELETE FROM dbo.ProductConcerns;
    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL DELETE FROM dbo.ProductFAQ;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL DELETE FROM dbo.ProductImages;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL DELETE FROM dbo.ProductPricing;
    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL DELETE FROM dbo.ProductInventory;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL DELETE FROM dbo.ProductCatalog;

    IF OBJECT_ID('dbo.AdminAuditLog', 'U') IS NOT NULL DELETE FROM dbo.AdminAuditLog;
    IF OBJECT_ID('dbo.UserLoginHistory', 'U') IS NOT NULL DELETE FROM dbo.UserLoginHistory;

    -- Reset identity values so the next insert starts at 1.
    IF OBJECT_ID('dbo.SupplyPricing', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyPricing', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyArrivalItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyArrivalItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyArrivalVerifications', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyArrivalVerifications', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyShipmentCharges', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyShipmentCharges', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyShipmentItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyShipmentItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyShipments', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyShipments', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyProcurementCardCharges', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyProcurementCardCharges', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyProcurementDiscountAllocations', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyProcurementDiscountAllocations', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyProcurementDiscounts', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyProcurementDiscounts', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyProcurementItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyProcurementItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyProcurements', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyProcurements', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyDeletedItemsLog', RESEED, 0) WITH NO_INFOMSGS;

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.Dispatch', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProcurementItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProcurementItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProcurementOrders', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProcurementOrders', RESEED, 0) WITH NO_INFOMSGS;

    IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.OrderItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.Orders', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductReviews', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductReviews', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductFAQ', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductImages', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductPricing', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductCatalog', RESEED, 0) WITH NO_INFOMSGS;

    IF OBJECT_ID('dbo.AdminAuditLog', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.AdminAuditLog', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.UserLoginHistory', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.UserLoginHistory', RESEED, 0) WITH NO_INFOMSGS;

    -- Re-enable and validate constraints.
    IF OBJECT_ID('dbo.SupplyPricing', 'U') IS NOT NULL ALTER TABLE dbo.SupplyPricing WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyArrivalItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyArrivalItems WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyArrivalVerifications', 'U') IS NOT NULL ALTER TABLE dbo.SupplyArrivalVerifications WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipmentCharges', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipmentCharges WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipmentItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipmentItems WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipments', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipments WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementCardCharges', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementCardCharges WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementDiscountAllocations', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementDiscountAllocations WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementDiscounts', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementDiscounts WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurementItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurementItems WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyProcurements', 'U') IS NOT NULL ALTER TABLE dbo.SupplyProcurements WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL ALTER TABLE dbo.SupplyDeletedItemsLog WITH CHECK CHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL ALTER TABLE dbo.Dispatch WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProcurementItems', 'U') IS NOT NULL ALTER TABLE dbo.ProcurementItems WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProcurementOrders', 'U') IS NOT NULL ALTER TABLE dbo.ProcurementOrders WITH CHECK CHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL ALTER TABLE dbo.OrderItems WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL ALTER TABLE dbo.Orders WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductReviews', 'U') IS NOT NULL ALTER TABLE dbo.ProductReviews WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL ALTER TABLE dbo.ProductPaymentOptions WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL ALTER TABLE dbo.ProductConcerns WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL ALTER TABLE dbo.ProductFAQ WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL ALTER TABLE dbo.ProductImages WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL ALTER TABLE dbo.ProductPricing WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL ALTER TABLE dbo.ProductInventory WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL ALTER TABLE dbo.ProductCatalog WITH CHECK CHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.AdminAuditLog', 'U') IS NOT NULL ALTER TABLE dbo.AdminAuditLog WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.UserLoginHistory', 'U') IS NOT NULL ALTER TABLE dbo.UserLoginHistory WITH CHECK CHECK CONSTRAINT ALL;

    COMMIT TRAN;

    SELECT 'Operational data cleared. Reference tables and user login tables were preserved.' AS Result;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    THROW;
END CATCH;
