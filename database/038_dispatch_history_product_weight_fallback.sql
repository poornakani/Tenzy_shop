/*
    Migration 038: Dispatch history product weight fallback

    Some older dispatch rows were saved with SupplyShipmentItems.WeightKg as
    zero. Use procurement item/catalog weight as a fallback so history can
    still show product weight.
*/

CREATE OR ALTER PROCEDURE dbo.spSupplyDispatch_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    WITH ItemSummary AS
    (
        SELECT
            si.ShipmentId,
            TotalProductCost = SUM(CASE WHEN si.IsDeleted = 0 THEN si.NetAmount ELSE 0 END),
            TotalQuantity = SUM(CASE WHEN si.IsDeleted = 0 THEN si.QuantityDispatched ELSE 0 END),
            TotalDispatchedWeight = SUM(
                CASE
                    WHEN si.IsDeleted = 0 THEN
                        ISNULL(
                            NULLIF(si.WeightKg, 0),
                            ISNULL(NULLIF(pi.Weight, 0), ISNULL(CAST(pc.weight AS DECIMAL(18,3)) / 1000, 0))
                        ) * si.QuantityDispatched
                    ELSE 0
                END
            )
        FROM dbo.SupplyShipmentItems si
        LEFT JOIN dbo.SupplyProcurementItems pi ON pi.ProcurementItemId = si.ProcurementItemId
        LEFT JOIN dbo.ProductCatalog pc ON pc.productid = si.ProductId
        GROUP BY si.ShipmentId
    ),
    ChargeSummary AS
    (
        SELECT
            ShipmentId,
            TotalShipmentCharges = SUM(Amount),
            BoxCount = MAX(CASE WHEN ChargeType = 'home_to_uk_courier' THEN BoxCount END),
            HomeToUkCourierPerBox = MAX(CASE WHEN ChargeType = 'home_to_uk_courier' THEN RateValue END),
            UkToSriLankaCourierPerKg = MAX(CASE WHEN ChargeType = 'uk_to_sri_lanka_courier' THEN RateValue END),
            DispatchBoxWeightCharge = MAX(CASE WHEN ChargeType = 'uk_to_sri_lanka_courier' THEN BasisAmount END)
        FROM dbo.SupplyShipmentCharges
        GROUP BY ShipmentId
    )
    SELECT
        s.ShipmentId,
        s.DispatchReference,
        s.DispatchDate,
        s.CourierName,
        s.ParcelNumber,
        s.ShipmentStatus,
        s.Notes,
        DispatchBoxWeightKg = ISNULL(s.DispatchBoxWeightKg, ISNULL(c.DispatchBoxWeightCharge, 0)),
        TotalProductCost = ISNULL(i.TotalProductCost, 0),
        TotalShipmentCharges = ISNULL(c.TotalShipmentCharges, 0),
        TotalLandedCost = ISNULL(i.TotalProductCost, 0) + ISNULL(c.TotalShipmentCharges, 0),
        TotalQuantity = ISNULL(i.TotalQuantity, 0),
        TotalDispatchedWeight = ISNULL(i.TotalDispatchedWeight, 0),
        BoxCount = ISNULL(c.BoxCount, 0),
        HomeToUkCourierPerBox = ISNULL(c.HomeToUkCourierPerBox, 0),
        UkToSriLankaCourierPerKg = ISNULL(c.UkToSriLankaCourierPerKg, 0)
    FROM dbo.SupplyShipments s
    LEFT JOIN ItemSummary i ON i.ShipmentId = s.ShipmentId
    LEFT JOIN ChargeSummary c ON c.ShipmentId = s.ShipmentId
    ORDER BY s.DispatchDate DESC, s.ShipmentId DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSupplyDispatch_GetById
    @ShipmentId INT
AS
BEGIN
    SET NOCOUNT ON;

    WITH ItemSummary AS
    (
        SELECT
            si.ShipmentId,
            TotalProductCost = SUM(CASE WHEN si.IsDeleted = 0 THEN si.NetAmount ELSE 0 END),
            TotalQuantity = SUM(CASE WHEN si.IsDeleted = 0 THEN si.QuantityDispatched ELSE 0 END),
            TotalDispatchedWeight = SUM(
                CASE
                    WHEN si.IsDeleted = 0 THEN
                        ISNULL(
                            NULLIF(si.WeightKg, 0),
                            ISNULL(NULLIF(pi.Weight, 0), ISNULL(CAST(pc.weight AS DECIMAL(18,3)) / 1000, 0))
                        ) * si.QuantityDispatched
                    ELSE 0
                END
            )
        FROM dbo.SupplyShipmentItems si
        LEFT JOIN dbo.SupplyProcurementItems pi ON pi.ProcurementItemId = si.ProcurementItemId
        LEFT JOIN dbo.ProductCatalog pc ON pc.productid = si.ProductId
        WHERE si.ShipmentId = @ShipmentId
        GROUP BY si.ShipmentId
    ),
    ChargeSummary AS
    (
        SELECT
            ShipmentId,
            TotalShipmentCharges = SUM(Amount),
            BoxCount = MAX(CASE WHEN ChargeType = 'home_to_uk_courier' THEN BoxCount END),
            HomeToUkCourierPerBox = MAX(CASE WHEN ChargeType = 'home_to_uk_courier' THEN RateValue END),
            UkToSriLankaCourierPerKg = MAX(CASE WHEN ChargeType = 'uk_to_sri_lanka_courier' THEN RateValue END),
            DispatchBoxWeightCharge = MAX(CASE WHEN ChargeType = 'uk_to_sri_lanka_courier' THEN BasisAmount END)
        FROM dbo.SupplyShipmentCharges
        WHERE ShipmentId = @ShipmentId
        GROUP BY ShipmentId
    )
    SELECT
        s.ShipmentId,
        s.DispatchReference,
        s.DispatchDate,
        s.CourierName,
        s.ParcelNumber,
        s.ShipmentStatus,
        s.Notes,
        DispatchBoxWeightKg = ISNULL(s.DispatchBoxWeightKg, ISNULL(c.DispatchBoxWeightCharge, 0)),
        TotalProductCost = ISNULL(i.TotalProductCost, 0),
        TotalShipmentCharges = ISNULL(c.TotalShipmentCharges, 0),
        TotalLandedCost = ISNULL(i.TotalProductCost, 0) + ISNULL(c.TotalShipmentCharges, 0),
        TotalQuantity = ISNULL(i.TotalQuantity, 0),
        TotalDispatchedWeight = ISNULL(i.TotalDispatchedWeight, 0),
        BoxCount = ISNULL(c.BoxCount, 0),
        HomeToUkCourierPerBox = ISNULL(c.HomeToUkCourierPerBox, 0),
        UkToSriLankaCourierPerKg = ISNULL(c.UkToSriLankaCourierPerKg, 0)
    FROM dbo.SupplyShipments s
    LEFT JOIN ItemSummary i ON i.ShipmentId = s.ShipmentId
    LEFT JOIN ChargeSummary c ON c.ShipmentId = s.ShipmentId
    WHERE s.ShipmentId = @ShipmentId;

    SELECT
        si.ShipmentItemId,
        si.ShipmentId,
        si.ProcurementItemId,
        si.ProcurementId,
        si.ProductId,
        si.ProductName,
        si.BrandName,
        si.CategoryName,
        si.QuantityDispatched,
        si.NetUnitCost,
        si.NetAmount,
        si.TaxAmount,
        WeightKg = ISNULL(
            NULLIF(si.WeightKg, 0),
            ISNULL(NULLIF(pi.Weight, 0), ISNULL(CAST(pc.weight AS DECIMAL(18,3)) / 1000, 0))
        )
    FROM dbo.SupplyShipmentItems si
    LEFT JOIN dbo.SupplyProcurementItems pi ON pi.ProcurementItemId = si.ProcurementItemId
    LEFT JOIN dbo.ProductCatalog pc ON pc.productid = si.ProductId
    WHERE si.ShipmentId = @ShipmentId AND si.IsDeleted = 0
    ORDER BY si.ShipmentItemId;

    SELECT
        ShipmentChargeId,
        ShipmentId,
        ChargeType,
        CurrencyCode,
        Amount,
        BoxCount,
        RateValue,
        BasisAmount,
        ChargeDate,
        Notes
    FROM dbo.SupplyShipmentCharges
    WHERE ShipmentId = @ShipmentId
    ORDER BY ChargeDate;
END;
GO

PRINT 'Migration 038 complete - dispatch history product weight falls back to procurement/catalog weight.';
