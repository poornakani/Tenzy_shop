/*
    Migration 039: Dispatch report goods weight fallback

    Fixes the Reports > Dispatch Goods kg value for shipments whose
    SupplyShipmentItems.WeightKg was saved as zero.
*/

CREATE OR ALTER PROCEDURE dbo.spSupplyReport_Dispatch
    @StartDate      DATETIME2     = NULL,
    @EndDate        DATETIME2     = NULL,
    @CourierName    NVARCHAR(150) = NULL,
    @BrandName      NVARCHAR(150) = NULL,
    @ProductName    NVARCHAR(250) = NULL,
    @CategoryName   NVARCHAR(150) = NULL,
    @ShipmentStatus NVARCHAR(30)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    WITH ChargeSummary AS
    (
        SELECT
            ShipmentId,
            UkCourierCharge          = SUM(CASE WHEN ChargeType IN ('home_to_uk_courier','uk_courier')      THEN Amount ELSE 0 END),
            SriLankaCourierCharge    = SUM(CASE WHEN ChargeType IN ('uk_to_sri_lanka_courier','sl_courier') THEN Amount ELSE 0 END),
            TaxCharge                = SUM(CASE WHEN ChargeType = 'tax'                                     THEN Amount ELSE 0 END),
            AdditionalCharge         = SUM(CASE WHEN ChargeType NOT IN ('home_to_uk_courier','uk_courier',
                                                  'uk_to_sri_lanka_courier','sl_courier','tax')             THEN Amount ELSE 0 END),
            TotalShipmentCharge      = SUM(Amount),
            BoxCount                 = MAX(CASE WHEN ChargeType = 'home_to_uk_courier'      THEN BoxCount    ELSE NULL END),
            HomeToUkCourierPerBox    = MAX(CASE WHEN ChargeType = 'home_to_uk_courier'      THEN RateValue   ELSE NULL END),
            UkToSriLankaCourierPerKg = MAX(CASE WHEN ChargeType = 'uk_to_sri_lanka_courier' THEN RateValue   ELSE NULL END),
            DispatchBoxWeightCharge  = MAX(CASE WHEN ChargeType = 'uk_to_sri_lanka_courier' THEN BasisAmount ELSE NULL END)
        FROM dbo.SupplyShipmentCharges
        GROUP BY ShipmentId
    )
    SELECT
        s.DispatchReference,
        s.DispatchDate,
        s.CourierName,
        s.ParcelNumber,
        s.ShipmentStatus,
        s.Notes,
        si.ShipmentItemId,
        si.ProcurementItemId,
        si.ProductName,
        si.BrandName,
        si.CategoryName,
        si.QuantityDispatched,
        WeightKg = ISNULL(
            NULLIF(si.WeightKg, 0),
            ISNULL(NULLIF(pi.Weight, 0), ISNULL(CAST(pc.weight AS DECIMAL(18,3)) / 1000, 0))
        ),

        UnitPrice  = pi.UnitPrice,
        GrossTotal = pi.UnitPrice * si.QuantityDispatched,

        DiscountTotal = CASE
            WHEN pi.Quantity > 0
            THEN ROUND(pi.DiscountTotal
                       * CAST(si.QuantityDispatched AS DECIMAL(18,4))
                       / CAST(pi.Quantity           AS DECIMAL(18,4)), 2)
            ELSE 0
        END,

        DiscountDescription = (
            SELECT TOP 1
                CASE d.DiscountType
                    WHEN 'percentage'            THEN CAST(CAST(ROUND(d.Percentage,0) AS INT) AS NVARCHAR(10)) + '% off'
                    WHEN 'fixed_amount'          THEN N'£' + CAST(d.FixedAmount AS NVARCHAR(20)) + ' off'
                    WHEN 'buy_x_get_amount_off'  THEN N'Buy ' + CAST(d.BuyQuantity AS NVARCHAR(10)) + N', get £' + CAST(d.FixedAmount AS NVARCHAR(20)) + ' off'
                    WHEN 'buy_x_pay_y'           THEN N'Buy ' + CAST(d.BuyQuantity AS NVARCHAR(10)) + N' pay ' + CAST(d.PayQuantity AS NVARCHAR(10))
                    WHEN 'third_item_half_price'  THEN N'Every 3rd item half price'
                    ELSE ISNULL(d.Description, d.DiscountType)
                END
            FROM dbo.SupplyProcurementDiscountAllocations da
            INNER JOIN dbo.SupplyProcurementDiscounts d ON d.DiscountId = da.DiscountId
            WHERE da.ProcurementItemId = si.ProcurementItemId
            ORDER BY da.DiscountId
        ),

        ProductCost = si.NetAmount,
        NetUnitCost = pi.NetUnitCost,

        UkCourierCharge          = ISNULL(c.UkCourierCharge,          0),
        SriLankaCourierCharge    = ISNULL(c.SriLankaCourierCharge,    0),
        BoxCount                 = ISNULL(c.BoxCount,                 0),
        HomeToUkCourierPerBox    = ISNULL(c.HomeToUkCourierPerBox,    0),
        UkToSriLankaCourierPerKg = ISNULL(c.UkToSriLankaCourierPerKg, 0),

        TotalDispatchedWeight = ISNULL(
            ISNULL(
                NULLIF(si.WeightKg, 0),
                ISNULL(NULLIF(pi.Weight, 0), ISNULL(CAST(pc.weight AS DECIMAL(18,3)) / 1000, 0))
            ) * si.QuantityDispatched,
            0
        ),

        DispatchBoxWeight = ISNULL(s.DispatchBoxWeightKg, ISNULL(c.DispatchBoxWeightCharge, 0)),

        TaxCharge           = ISNULL(c.TaxCharge,            0),
        AdditionalCharge    = ISNULL(c.AdditionalCharge,     0),
        TotalShipmentCharge = ISNULL(c.TotalShipmentCharge,  0)

    FROM dbo.SupplyShipments s
    INNER JOIN dbo.SupplyShipmentItems    si ON si.ShipmentId        = s.ShipmentId
    INNER JOIN dbo.SupplyProcurementItems pi ON pi.ProcurementItemId = si.ProcurementItemId
    LEFT  JOIN dbo.ProductCatalog         pc ON pc.productid         = si.ProductId
    LEFT  JOIN ChargeSummary              c  ON c.ShipmentId         = s.ShipmentId
    WHERE si.IsDeleted = 0
      AND (@StartDate      IS NULL OR s.DispatchDate   >= @StartDate)
      AND (@EndDate        IS NULL OR s.DispatchDate   <  DATEADD(DAY, 1, @EndDate))
      AND (@CourierName    IS NULL OR s.CourierName    =  @CourierName)
      AND (@BrandName      IS NULL OR si.BrandName     =  @BrandName)
      AND (@ProductName    IS NULL OR si.ProductName   =  @ProductName)
      AND (@CategoryName   IS NULL OR si.CategoryName  =  @CategoryName)
      AND (@ShipmentStatus IS NULL OR s.ShipmentStatus =  @ShipmentStatus)
    ORDER BY s.DispatchDate DESC, s.ShipmentId DESC, si.ShipmentItemId;
END;
GO

PRINT 'Migration 039 complete - dispatch report Goods kg uses effective product weight.';
