/*
    Tenzy shop UK purchase reset

    Purpose:
      Clear all UK Purchase data and anything downstream that reports from it:
      dispatches, arrivals, pricing, procurement items, discounts, deleted-item
      logs, and card payment charge rows.

    Preserved reference/login tables:
      dbo.SupplyShops
      dbo.PaymentCards
      dbo.Brand
      dbo.Category
      dbo.ConcernTypes
      dbo.PaymentType
      dbo.Users

    Notes:
      Reports are generated from the supply-chain tables, so there is no report
      table to delete. Once this script runs, UK Purchase reports and card
      payment totals will return empty results.

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

    -- Older/simple procurement and dispatch tables, if still present.
    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL ALTER TABLE dbo.Dispatch NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProcurementItems', 'U') IS NOT NULL ALTER TABLE dbo.ProcurementItems NOCHECK CONSTRAINT ALL;
    IF OBJECT_ID('dbo.ProcurementOrders', 'U') IS NOT NULL ALTER TABLE dbo.ProcurementOrders NOCHECK CONSTRAINT ALL;

    -- Delete report source rows from downstream back to UK purchases.
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
    IF OBJECT_ID('dbo.SupplyDeletedItemsLog', 'U') IS NOT NULL
        DELETE FROM dbo.SupplyDeletedItemsLog
        WHERE TableName IN (
            'SupplyProcurements',
            'SupplyProcurementItems',
            'SupplyProcurementDiscounts',
            'SupplyProcurementDiscountAllocations',
            'SupplyProcurementCardCharges',
            'SupplyShipments',
            'SupplyShipmentItems',
            'SupplyShipmentCharges',
            'SupplyArrivalVerifications',
            'SupplyArrivalItems',
            'SupplyPricing'
        );

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL DELETE FROM dbo.Dispatch;
    IF OBJECT_ID('dbo.ProcurementItems', 'U') IS NOT NULL DELETE FROM dbo.ProcurementItems;
    IF OBJECT_ID('dbo.ProcurementOrders', 'U') IS NOT NULL DELETE FROM dbo.ProcurementOrders;

    -- Reset identities so the next UK Purchase flow starts cleanly.
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

    IF OBJECT_ID('dbo.Dispatch', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.Dispatch', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProcurementItems', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProcurementItems', RESEED, 0) WITH NO_INFOMSGS;
    IF OBJECT_ID('dbo.ProcurementOrders', 'U') IS NOT NULL DBCC CHECKIDENT ('dbo.ProcurementOrders', RESEED, 0) WITH NO_INFOMSGS;

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

    COMMIT TRAN;

    SELECT 'UK Purchase data, report source rows, and card payment charges cleared. Reference shops and payment cards were preserved.' AS Result;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    THROW;
END CATCH;
