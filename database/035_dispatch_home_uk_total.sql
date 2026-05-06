/*
    Migration 035: Dispatch courier totals from organised boxes

    Allows the API to pass the exact Home to UK courier total from all boxes.
    Existing callers can still use BoxCount * HomeToUkCourierPerBox.
*/

CREATE OR ALTER PROCEDURE dbo.spSupplyDispatch_Save
    @ShipmentId               INT              = NULL,
    @DispatchReference        NVARCHAR(50),
    @DispatchDate             DATETIME2,
    @CourierName              NVARCHAR(150),
    @ParcelNumber             NVARCHAR(120),
    @BoxCount                 INT,
    @HomeToUkCourierPerBox    DECIMAL(18,4),
    @HomeToUkCourierTotal     DECIMAL(18,2)    = NULL,
    @UkToSriLankaCourierPerKg DECIMAL(18,4),
    @TotalWeightOverride      DECIMAL(18,3)    = NULL,
    @ShipmentStatus           NVARCHAR(30),
    @Notes                    NVARCHAR(500)    = NULL,
    @CreatedByUserId          UNIQUEIDENTIFIER,
    @ItemsJson                NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @TotalProductCost      DECIMAL(18,4) = 0;
    DECLARE @TotalDispatchedWeight DECIMAL(18,4) = 0;
    DECLARE @EffectiveWeight       DECIMAL(18,4) = 0;
    DECLARE @HomeToUkAmount        DECIMAL(18,2) = 0;
    DECLARE @UkToSriLankaAmount    DECIMAL(18,2) = 0;

    BEGIN TRAN;

    IF @ShipmentId IS NULL
    BEGIN
        INSERT INTO dbo.SupplyShipments
            (DispatchReference, DispatchDate, CourierName, ParcelNumber,
             ShipmentStatus, Notes, CreatedByUserId)
        VALUES
            (@DispatchReference, @DispatchDate, @CourierName, @ParcelNumber,
             @ShipmentStatus, @Notes, @CreatedByUserId);
        SET @ShipmentId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.SupplyShipments
        SET DispatchReference = @DispatchReference,
            DispatchDate      = @DispatchDate,
            CourierName       = @CourierName,
            ParcelNumber      = @ParcelNumber,
            ShipmentStatus    = @ShipmentStatus,
            Notes             = @Notes,
            UpdatedAtUtc      = SYSUTCDATETIME()
        WHERE ShipmentId = @ShipmentId;

        DELETE FROM dbo.SupplyShipmentCharges WHERE ShipmentId = @ShipmentId;
        DELETE FROM dbo.SupplyShipmentItems   WHERE ShipmentId = @ShipmentId;
    END

    INSERT INTO dbo.SupplyShipmentItems
    (
        ShipmentId, ProcurementItemId, ProcurementId, ProductId,
        ProductName, BrandName, CategoryName,
        QuantityDispatched, NetUnitCost, NetAmount, TaxAmount, WeightKg
    )
    SELECT
        @ShipmentId,
        p.ProcurementItemId,
        p.ProcurementId,
        p.ProductId,
        p.ProductName,
        p.BrandName,
        p.CategoryName,
        j.QuantityDispatched,
        p.NetUnitCost,
        ROUND(j.QuantityDispatched * p.NetUnitCost, 2),
        ISNULL(j.TaxAmount, 0),
        ISNULL(
            NULLIF(j.WeightKg, 0),
            ISNULL(p.Weight, ISNULL(CAST(pc.weight AS DECIMAL(18,3)) / 1000, 0))
        )
    FROM OPENJSON(@ItemsJson)
    WITH
    (
        ProcurementItemId  INT           '$.procurementItemId',
        QuantityDispatched INT           '$.quantityDispatched',
        TaxAmount          DECIMAL(18,4) '$.taxAmount',
        WeightKg           DECIMAL(18,3) '$.weightKg'
    ) j
    INNER JOIN dbo.SupplyProcurementItems p  ON p.ProcurementItemId = j.ProcurementItemId
    LEFT  JOIN dbo.ProductCatalog         pc ON pc.productid        = p.ProductId;

    SELECT
        @TotalProductCost      = ISNULL(SUM(NetAmount), 0),
        @TotalDispatchedWeight = ISNULL(SUM(WeightKg * QuantityDispatched), 0)
    FROM dbo.SupplyShipmentItems
    WHERE ShipmentId = @ShipmentId;

    SET @EffectiveWeight = ISNULL(@TotalWeightOverride, @TotalDispatchedWeight);

    UPDATE dbo.SupplyShipments
    SET DispatchBoxWeightKg = @EffectiveWeight
    WHERE ShipmentId = @ShipmentId;

    SET @HomeToUkAmount = ROUND(ISNULL(@HomeToUkCourierTotal, ISNULL(@BoxCount, 0) * ISNULL(@HomeToUkCourierPerBox, 0)), 2);
    SET @UkToSriLankaAmount = ROUND(@EffectiveWeight * ISNULL(@UkToSriLankaCourierPerKg, 0), 2);

    INSERT INTO dbo.SupplyShipmentCharges
        (ShipmentId, ChargeType, CurrencyCode, Amount, ChargeDate, Notes, EnteredByUserId, BoxCount, RateValue, BasisAmount)
    VALUES
        (@ShipmentId, 'home_to_uk_courier', 'GBP', @HomeToUkAmount, @DispatchDate,
         'Box-count courier charge', @CreatedByUserId, @BoxCount, @HomeToUkCourierPerBox, NULL),
        (@ShipmentId, 'uk_to_sri_lanka_courier', 'GBP', @UkToSriLankaAmount, @DispatchDate,
         'Weight-based courier charge', @CreatedByUserId, NULL, @UkToSriLankaCourierPerKg, @EffectiveWeight);

    UPDATE p
    SET Status       = 'dispatched',
        UpdatedAtUtc = SYSUTCDATETIME()
    FROM dbo.SupplyProcurements p
    WHERE EXISTS (
        SELECT 1 FROM dbo.SupplyShipmentItems si
        WHERE si.ShipmentId    = @ShipmentId
          AND si.ProcurementId = p.ProcurementId
    );

    COMMIT TRAN;
    SELECT @ShipmentId;
END;
GO

PRINT 'Migration 035 complete - dispatch Home to UK total is accepted by spSupplyDispatch_Save.';
