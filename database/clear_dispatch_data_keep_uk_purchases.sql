/*
    Tenzy shop dispatch reset

    Purpose:
      Clear dispatch and downstream supply-chain data so the admin flow can
      start again from existing UK Purchase records in the database.

    Preserved data:
      dbo.SupplyProcurements
      dbo.SupplyProcurementItems
      dbo.SupplyProcurementDiscounts
      dbo.SupplyProcurementDiscountAllocations
      reference/login tables

    Cleared data:
      Dispatch shipments, shipment items, shipment charges, arrival
      verification rows, pricing rows, deleted dispatch logs, and generated
      live product/catalog rows that depend on dispatched/arrived stock.

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
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL ALTER TABLE dbo.SupplyDeletedItemsLog NOCHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL ALTER TABLE dbo.Dispatch NOCHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL ALTER TABLE dbo.ProductPaymentOptions NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL ALTER TABLE dbo.ProductConcerns NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL ALTER TABLE dbo.ProductFAQ NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL ALTER TABLE dbo.ProductImages NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL ALTER TABLE dbo.ProductPricing NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL ALTER TABLE dbo.ProductInventory NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL ALTER TABLE dbo.ProductCatalog NOCHECK CONSTRAINT ALL;

    -- Delete rows that depend on dispatches before deleting dispatch parents.
    IF OBJECT_ID('dbo.SupplyPricing', 'U') IS NOT NULL DELETE FROM dbo.SupplyPricing;
    IF OBJECT_ID('dbo.SupplyArrivalItems', 'U') IS NOT NULL DELETE FROM dbo.SupplyArrivalItems;
    IF OBJECT_ID('dbo.SupplyArrivalVerifications', 'U') IS NOT NULL DELETE FROM dbo.SupplyArrivalVerifications;
    IF OBJECT_ID('dbo.SupplyShipmentCharges', 'U') IS NOT NULL DELETE FROM dbo.SupplyShipmentCharges;
    IF OBJECT_ID('dbo.SupplyShipmentItems', 'U') IS NOT NULL DELETE FROM dbo.SupplyShipmentItems;
    IF OBJECT_ID('dbo.SupplyShipments', 'U') IS NOT NULL DELETE FROM dbo.SupplyShipments;
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL
        DELETE FROM dbo.SupplyDeletedItemsLog
        WHERE TableName IN ('SupplyShipmentItems', 'SupplyShipments', 'SupplyArrivalItems', 'SupplyArrivalVerifications', 'SupplyPricing');

    -- Older/simple order dispatch table, if still present.
    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL DELETE FROM dbo.Dispatch;

    -- Product rows generated from arrival/pricing should be rebuilt from the new flow.
    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL DELETE FROM dbo.ProductPaymentOptions;
    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL DELETE FROM dbo.ProductConcerns;
    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL DELETE FROM dbo.ProductFAQ;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL DELETE FROM dbo.ProductImages;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL DELETE FROM dbo.ProductPricing;
    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL DELETE FROM dbo.ProductInventory;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL DELETE FROM dbo.ProductCatalog;

    -- Reset identity values so the next dispatch insert starts at 1.
    IF OBJECT_ID('dbo.SupplyPricing', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyPricing', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyArrivalItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyArrivalItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyArrivalVerifications', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyArrivalVerifications', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyShipmentCharges', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyShipmentCharges', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyShipmentItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyShipmentItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.SupplyShipments', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.SupplyShipments', RESEED, 0) WITH NO_INFOMSGS;

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.Dispatch', RESEED, 0) WITH NO_INFOMSGS;

    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductFAQ', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductImages', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductPricing', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProductCatalog', RESEED, 0) WITH NO_INFOMSGS;

    -- Re-enable and validate constraints.
    IF OBJECT_ID('dbo.SupplyPricing', 'U') IS NOT NULL ALTER TABLE dbo.SupplyPricing WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyArrivalItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyArrivalItems WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyArrivalVerifications', 'U') IS NOT NULL ALTER TABLE dbo.SupplyArrivalVerifications WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipmentCharges', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipmentCharges WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipmentItems', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipmentItems WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyShipments', 'U') IS NOT NULL ALTER TABLE dbo.SupplyShipments WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL ALTER TABLE dbo.SupplyDeletedItemsLog WITH CHECK CHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL ALTER TABLE dbo.Dispatch WITH CHECK CHECK CONSTRAINT ALL;

    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL ALTER TABLE dbo.ProductPaymentOptions WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL ALTER TABLE dbo.ProductConcerns WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL ALTER TABLE dbo.ProductFAQ WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL ALTER TABLE dbo.ProductImages WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL ALTER TABLE dbo.ProductPricing WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL ALTER TABLE dbo.ProductInventory WITH CHECK CHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProductCatalog', 'U') IS NOT NULL ALTER TABLE dbo.ProductCatalog WITH CHECK CHECK CONSTRAINT ALL;

    COMMIT TRAN;

    SELECT 'Dispatch data cleared. Existing UK Purchase records were preserved for reports and new dispatches.' AS Result;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    THROW;
END CATCH;
