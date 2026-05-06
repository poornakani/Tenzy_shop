/*
    Migration 036: Dispatch history totals

    Returns box count, rates, item weight, rounded dispatch weight, and
    correct shipment charges without multiplying charges by item rows.
*/

CREATE OR ALTER PROCEDURE dbo.spSupplyDispatch_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    WITH ItemSummary AS
    (
        SELECT
            ShipmentId,
            TotalProductCost = SUM(CASE WHEN IsDeleted = 0 THEN NetAmount ELSE 0 END),
            TotalQuantity = SUM(CASE WHEN IsDeleted = 0 THEN QuantityDispatched ELSE 0 END),
            TotalDispatchedWeight = SUM(CASE WHEN IsDeleted = 0 THEN ISNULL(WeightKg, 0) * QuantityDispatched ELSE 0 END)
        FROM dbo.SupplyShipmentItems
        GROUP BY ShipmentId
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
            ShipmentId,
            TotalProductCost = SUM(CASE WHEN IsDeleted = 0 THEN NetAmount ELSE 0 END),
            TotalQuantity = SUM(CASE WHEN IsDeleted = 0 THEN QuantityDispatched ELSE 0 END),
            TotalDispatchedWeight = SUM(CASE WHEN IsDeleted = 0 THEN ISNULL(WeightKg, 0) * QuantityDispatched ELSE 0 END)
        FROM dbo.SupplyShipmentItems
        WHERE ShipmentId = @ShipmentId
        GROUP BY ShipmentId
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
        ShipmentItemId,
        ShipmentId,
        ProcurementItemId,
        ProcurementId,
        ProductId,
        ProductName,
        BrandName,
        CategoryName,
        QuantityDispatched,
        NetUnitCost,
        NetAmount,
        TaxAmount,
        WeightKg
    FROM dbo.SupplyShipmentItems
    WHERE ShipmentId = @ShipmentId AND IsDeleted = 0
    ORDER BY ShipmentItemId;

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

PRINT 'Migration 036 complete - dispatch history includes boxes, weights, units, and totals.';
