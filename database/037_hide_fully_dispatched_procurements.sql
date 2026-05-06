/*
    Migration 037: Hide fully dispatched UK purchases

    Keeps the dispatch picker focused on procurement records that still have
    at least one non-deleted item with quantity remaining to dispatch.
*/

CREATE OR ALTER PROCEDURE dbo.spSupplyProcurement_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    WITH Dispatched AS
    (
        SELECT
            ProcurementItemId,
            QuantityAlreadyDispatched = SUM(QuantityDispatched)
        FROM dbo.SupplyShipmentItems
        WHERE IsDeleted = 0
        GROUP BY ProcurementItemId
    )
    SELECT
        p.ProcurementId,
        p.ProcurementReference,
        p.ShopName,
        p.PurchaseDate,
        p.InvoiceReference,
        p.PaymentCardName,
        p.PaymentReference,
        p.Status,
        p.PurchaseNote,
        SUM(CASE WHEN i.IsDeleted = 0 THEN i.GrossTotal    ELSE 0 END) AS TotalGrossAmount,
        SUM(CASE WHEN i.IsDeleted = 0 THEN i.DiscountTotal ELSE 0 END) AS TotalDiscountAmount,
        SUM(CASE WHEN i.IsDeleted = 0 THEN i.NetTotal      ELSE 0 END) AS TotalNetAmount,
        COUNT(CASE WHEN i.IsDeleted = 0 THEN 1 END)                    AS ItemCount
    FROM dbo.SupplyProcurements p
    INNER JOIN dbo.SupplyProcurementItems i ON i.ProcurementId = p.ProcurementId
    LEFT JOIN Dispatched d ON d.ProcurementItemId = i.ProcurementItemId
    GROUP BY
        p.ProcurementId,
        p.ProcurementReference,
        p.ShopName,
        p.PurchaseDate,
        p.InvoiceReference,
        p.PaymentCardName,
        p.PaymentReference,
        p.Status,
        p.PurchaseNote
    HAVING SUM(
        CASE
            WHEN i.IsDeleted = 0
             AND i.Quantity > ISNULL(d.QuantityAlreadyDispatched, 0)
            THEN 1
            ELSE 0
        END
    ) > 0
    ORDER BY p.PurchaseDate DESC;
END;
GO

PRINT 'Migration 037 complete - fully dispatched UK purchases are hidden from dispatch selection.';
