/*
    Migration 042: Remove categories — products use concerns only.

    - Updates all product catalog SPs to remove category join/columns
    - Updates spProductCatalog_Insert and spProductCatalog_Update to remove @CategoryId
    - Updates dashboard and report SPs to group by concern instead of category
    - Drops all sp_Category_* stored procedures
    - Drops FK_ProductCatalog_Category constraint
    - Drops categoryid column from ProductCatalog
    - Drops Category table
*/

-- ── 1. spProductCatalog_GetAll (storefront) ───────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.spProductCatalog_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.productid,
        p.name,
        p.brandid,
        b.name                AS BrandName,
        p.description,
        p.weight,
        p.tabletcount,
        p.showweight,
        p.showtabletcount,
        p.insale,
        p.createdate,
        p.lastupdated,
        ISNULL(inv.stock, 0)  AS StockQuantity,
        ISNULL(pr.price, 0)   AS SellingPrice,
        ISNULL(
            ROUND(pr.price / NULLIF(1.0 - pr.discountrate / 100.0, 0), 2),
            ISNULL(pr.price, 0)
        )                     AS OriginalPrice,
        ISNULL(pr.discountrate, 0) AS DiscountRate,
        pr.StartUTC,
        pr.EndUTC,
        (SELECT TOP 1 pi2.ImageUrl
         FROM dbo.ProductImages pi2
         WHERE pi2.productid = p.productid AND pi2.IsPrimary = 1 AND pi2.IsActive = 1
         ORDER BY pi2.SortOrder, pi2.ImageId
        )                     AS PrimaryImageUrl,
        (SELECT STRING_AGG(CAST(pc.concernID AS NVARCHAR(20)), ',')
         FROM dbo.ProductConcerns pc
         WHERE pc.productid = p.productid
        )                     AS ConcernTypeIdsCsv
    FROM dbo.ProductCatalog p
    LEFT JOIN dbo.Brand            b   ON b.Brandid    = p.brandid AND b.Isactive = 1
    LEFT JOIN dbo.ProductInventory inv ON inv.ProductId = p.productid
    OUTER APPLY (
        SELECT TOP 1 pr1.*
        FROM dbo.ProductPricing pr1
        WHERE pr1.ProductId = p.productid
          AND (pr1.StartUTC IS NULL OR pr1.StartUTC <= SYSUTCDATETIME())
          AND (pr1.EndUTC   IS NULL OR pr1.EndUTC   >  SYSUTCDATETIME())
        ORDER BY pr1.StartUTC DESC, pr1.PricingId DESC
    ) pr
    ORDER BY p.productid DESC;
END;
GO

-- ── 2. spProductCatalog_GetAllAdmin ──────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.spProductCatalog_GetAllAdmin
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.productid,
        p.name,
        p.brandid,
        b.name                AS BrandName,
        p.description,
        p.weight,
        p.tabletcount,
        p.showweight,
        p.showtabletcount,
        p.insale,
        p.createdate,
        p.lastupdated,
        ISNULL(inv.stock, 0)  AS StockQuantity,
        ISNULL(pr.price, 0)   AS SellingPrice,
        ISNULL(
            ROUND(pr.price / NULLIF(1.0 - pr.discountrate / 100.0, 0), 2),
            ISNULL(pr.price, 0)
        )                     AS OriginalPrice,
        ISNULL(pr.discountrate, 0) AS DiscountRate,
        pr.StartUTC,
        pr.EndUTC,
        (SELECT TOP 1 ImageUrl
         FROM dbo.ProductImages pi2
         WHERE pi2.productid = p.productid AND pi2.IsPrimary = 1 AND pi2.IsActive = 1
        )                     AS PrimaryImageUrl,
        (SELECT STRING_AGG(CAST(pc.concernID AS NVARCHAR(20)), ',')
         FROM dbo.ProductConcerns pc
         WHERE pc.productid = p.productid
        )                     AS ConcernTypeIdsCsv,
        prc.WholesalePrice,
        prc.WebsitePrice,
        prc.TotalUnitCostLkr
    FROM dbo.ProductCatalog p
    LEFT JOIN dbo.Brand            b   ON b.Brandid    = p.brandid AND b.Isactive = 1
    LEFT JOIN dbo.ProductInventory inv ON inv.ProductId = p.productid
    OUTER APPLY (
        SELECT TOP 1 price, discountrate, StartUTC, EndUTC
        FROM dbo.ProductPricing pr1
        WHERE pr1.ProductId = p.productid
        ORDER BY ISNULL(pr1.lastupdated, pr1.createdate) DESC, pr1.PricingId DESC
    ) pr
    OUTER APPLY (
        SELECT TOP 1
            sp.WholesalePrice,
            sp.SellingPrice                               AS WebsitePrice,
            CASE WHEN sp.ExchangeRateGbpToLkr > 0
                 THEN ROUND(si.NetUnitCost * sp.ExchangeRateGbpToLkr
                            + ISNULL(sp.LandingCostLkr, 0), 0)
                 ELSE NULL END                            AS TotalUnitCostLkr
        FROM dbo.SupplyPricing sp
        JOIN dbo.SupplyArrivalItems  ai ON ai.ArrivalItemId  = sp.ArrivalItemId
        JOIN dbo.SupplyShipmentItems si ON si.ShipmentItemId = ai.ShipmentItemId
        WHERE ai.ProductId = p.productid
          AND sp.PricingReviewStatus = 'applied_live'
        ORDER BY sp.AppliedToProductAtUtc DESC, sp.PricingId DESC
    ) prc
    ORDER BY p.createdate DESC;
END;
GO

-- ── 3. spProductCatalog_GetById ───────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.spProductCatalog_GetById
    @ProductId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.productid,
        p.name,
        p.brandid,
        b.name                AS BrandName,
        p.description,
        p.weight,
        p.tabletcount,
        p.showweight,
        p.showtabletcount,
        p.insale,
        p.createdate,
        p.lastupdated,
        ISNULL(inv.stock, 0)  AS StockQuantity,
        ISNULL(pr.price, 0)   AS SellingPrice,
        ISNULL(
            ROUND(pr.price / NULLIF(1.0 - pr.discountrate / 100.0, 0), 2),
            ISNULL(pr.price, 0)
        )                     AS OriginalPrice,
        ISNULL(pr.discountrate, 0) AS DiscountRate,
        pr.StartUTC,
        pr.EndUTC,
        (SELECT TOP 1 ImageUrl
         FROM dbo.ProductImages pi2
         WHERE pi2.productid = p.productid AND pi2.IsPrimary = 1 AND pi2.IsActive = 1
        )                     AS PrimaryImageUrl
    FROM dbo.ProductCatalog p
    LEFT JOIN dbo.Brand            b   ON b.Brandid    = p.brandid AND b.Isactive = 1
    LEFT JOIN dbo.ProductInventory inv ON inv.ProductId = p.productid
    OUTER APPLY (
        SELECT TOP 1 price, discountrate, StartUTC, EndUTC
        FROM dbo.ProductPricing pr1
        WHERE pr1.ProductId = p.productid
        ORDER BY ISNULL(pr1.lastupdated, pr1.createdate) DESC, pr1.PricingId DESC
    ) pr
    WHERE p.productid = @ProductId;

    SELECT ImageId, productid, ImageUrl, IsPrimary, SortOrder, createdate, IsActive
    FROM   dbo.ProductImages
    WHERE  productid = @ProductId AND IsActive = 1
    ORDER BY IsPrimary DESC, SortOrder;

    SELECT FAQId, productid, Question, Answer, createdUTC, IsActive
    FROM   dbo.ProductFAQ
    WHERE  productid = @ProductId AND IsActive = 1;

    SELECT pc.productid, pc.concernID AS ConcernTypeId, ct.ConcernType
    FROM   dbo.ProductConcerns pc
    JOIN   dbo.ConcernTypes ct ON ct.ConcernTypeId = pc.concernID
    WHERE  pc.productid = @ProductId;

    SELECT pp.productid, pp.PaymentTypeId, pt.PaymentType, pp.instalment
    FROM   dbo.ProductPaymentOptions pp
    JOIN   dbo.PaymentType pt ON pt.PaymentTypeId = pp.PaymentTypeId
    WHERE  pp.productid = @ProductId;
END;
GO

-- ── 4. spProductCatalog_Insert ────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.spProductCatalog_Insert
    @Name            NVARCHAR(300),
    @BrandId         INT,
    @Description     NVARCHAR(MAX)  = NULL,
    @Weight          DECIMAL(18,3)  = NULL,
    @TabletCount     INT            = NULL,
    @ShowWeight      BIT            = 1,
    @ShowTabletCount BIT            = 0,
    @InSale          BIT            = 1,
    @SellingPrice    DECIMAL(18,2)  = 0,
    @OriginalPrice   DECIMAL(18,2)  = 0,
    @StockQuantity   INT            = 0,
    @StartUTC        DATETIME2      = NULL,
    @EndUTC          DATETIME2      = NULL,
    @ConcernTypeIds  NVARCHAR(MAX)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ProductId    INT;
    DECLARE @DiscountRate DECIMAL(5,2) =
        CASE WHEN @OriginalPrice > 0
             THEN ROUND((@OriginalPrice - @SellingPrice) / @OriginalPrice * 100.0, 2)
             ELSE 0 END;

    INSERT INTO dbo.ProductCatalog
        (name, brandid, description, weight, tabletcount, showweight, showtabletcount, insale, createdate)
    VALUES
        (@Name, @BrandId, @Description, @Weight, @TabletCount, @ShowWeight, @ShowTabletCount, @InSale, SYSUTCDATETIME());

    SET @ProductId = SCOPE_IDENTITY();

    INSERT INTO dbo.ProductInventory (ProductId, stock, LastStockUpdateUTC)
    VALUES (@ProductId, @StockQuantity, SYSUTCDATETIME());

    INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC, EndUTC, createdate, lastupdated)
    VALUES (@ProductId, @SellingPrice, @DiscountRate, ISNULL(@StartUTC, SYSUTCDATETIME()), @EndUTC, SYSUTCDATETIME(), SYSUTCDATETIME());

    IF @ConcernTypeIds IS NOT NULL AND LEN(TRIM(@ConcernTypeIds)) > 0
    BEGIN
        INSERT INTO dbo.ProductConcerns (productid, concernID)
        SELECT @ProductId, TRY_CAST(TRIM(value) AS INT)
        FROM   STRING_SPLIT(@ConcernTypeIds, ',')
        WHERE  TRIM(value) <> ''
          AND  TRY_CAST(TRIM(value) AS INT) IS NOT NULL
          AND  EXISTS (
              SELECT 1 FROM dbo.ConcernTypes ct
              WHERE  ct.ConcernTypeId = TRY_CAST(TRIM(value) AS INT)
          );
    END

    SELECT @ProductId AS productid;
END;
GO

-- ── 5. spProductCatalog_Update ────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.spProductCatalog_Update
    @ProductId       INT,
    @Name            NVARCHAR(300),
    @BrandId         INT,
    @Description     NVARCHAR(MAX)  = NULL,
    @Weight          DECIMAL(18,3)  = NULL,
    @TabletCount     INT            = NULL,
    @ShowWeight      BIT            = 1,
    @ShowTabletCount BIT            = 0,
    @InSale          BIT            = 1,
    @SellingPrice    DECIMAL(18,2)  = 0,
    @OriginalPrice   DECIMAL(18,2)  = 0,
    @StockQuantity   INT            = NULL,
    @StartUTC        DATETIME2      = NULL,
    @EndUTC          DATETIME2      = NULL,
    @ConcernTypeIds  NVARCHAR(MAX)  = NULL,
    @WholesalePrice  DECIMAL(18,2)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @DiscountRate DECIMAL(5,2) =
        CASE WHEN @OriginalPrice > 0
             THEN ROUND((@OriginalPrice - @SellingPrice) / @OriginalPrice * 100.0, 2)
             ELSE 0 END;

    UPDATE dbo.ProductCatalog
    SET name            = @Name,
        brandid         = @BrandId,
        description     = @Description,
        weight          = @Weight,
        tabletcount     = @TabletCount,
        showweight      = @ShowWeight,
        showtabletcount = @ShowTabletCount,
        insale          = @InSale,
        lastupdated     = SYSUTCDATETIME()
    WHERE productid = @ProductId;

    IF @StockQuantity IS NOT NULL
        UPDATE dbo.ProductInventory
        SET    stock = @StockQuantity, LastStockUpdateUTC = SYSUTCDATETIME()
        WHERE  ProductId = @ProductId;

    UPDATE dbo.ProductPricing
    SET    price        = @SellingPrice,
           discountrate = @DiscountRate,
           StartUTC     = ISNULL(@StartUTC, StartUTC),
           EndUTC       = @EndUTC,
           lastupdated  = SYSUTCDATETIME()
    WHERE  PricingId = (
        SELECT TOP 1 PricingId
        FROM dbo.ProductPricing
        WHERE ProductId = @ProductId
        ORDER BY ISNULL(lastupdated, createdate) DESC, PricingId DESC
    );

    IF @WholesalePrice IS NOT NULL OR @SellingPrice > 0
    BEGIN
        UPDATE dbo.SupplyPricing
        SET WholesalePrice    = CASE WHEN @WholesalePrice IS NOT NULL THEN @WholesalePrice ELSE WholesalePrice   END,
            SellingPrice      = CASE WHEN @SellingPrice   > 0         THEN @SellingPrice   ELSE SellingPrice     END,
            FinalSellingPrice = CASE WHEN @SellingPrice   > 0         THEN @SellingPrice   ELSE FinalSellingPrice END,
            UpdatedAtUtc      = SYSUTCDATETIME()
        WHERE PricingId = (
            SELECT TOP 1 sp.PricingId
            FROM dbo.SupplyPricing sp
            JOIN dbo.SupplyArrivalItems ai ON ai.ArrivalItemId = sp.ArrivalItemId
            WHERE ai.ProductId = @ProductId
              AND sp.PricingReviewStatus = 'applied_live'
            ORDER BY sp.AppliedToProductAtUtc DESC, sp.PricingId DESC
        );
    END

    IF @ConcernTypeIds IS NOT NULL
    BEGIN
        DELETE FROM dbo.ProductConcerns WHERE productid = @ProductId;
        IF LEN(TRIM(@ConcernTypeIds)) > 0
        BEGIN
            INSERT INTO dbo.ProductConcerns (productid, concernID)
            SELECT @ProductId, TRY_CAST(TRIM(value) AS INT)
            FROM   STRING_SPLIT(@ConcernTypeIds, ',')
            WHERE  TRIM(value) <> ''
              AND  TRY_CAST(TRIM(value) AS INT) IS NOT NULL
              AND  EXISTS (
                  SELECT 1 FROM dbo.ConcernTypes ct
                  WHERE  ct.ConcernTypeId = TRY_CAST(TRIM(value) AS INT)
              );
        END
    END
END;
GO

-- ── 6. Dashboard: replace category grouping with concern grouping ─────────────
-- Keep the SP name and column names so the C# model (CategorySalesModel) needs
-- no changes; the "Category" column now contains concern type names.
CREATE OR ALTER PROCEDURE dbo.spDashboard_GetCategorySales
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ct.ConcernType   AS Category,
           SUM(oi.Qty)      AS Units,
           SUM(oi.LineTotal) AS Revenue
    FROM   dbo.OrderItems oi
    JOIN   dbo.ProductCatalog p  ON p.productid    = oi.ProductId
    JOIN   dbo.ProductConcerns pc ON pc.productid  = p.productid
    JOIN   dbo.ConcernTypes ct   ON ct.ConcernTypeId = pc.concernID
    JOIN   dbo.Orders o          ON o.Id           = oi.OrderId
    WHERE  o.Status NOT IN ('cancelled','refunded')
    GROUP BY ct.ConcernType
    ORDER BY Revenue DESC;
END;
GO

-- ── 7. Reports: replace category grouping with concern grouping ───────────────
-- Keep the SP name and column names so ReportCategorySalesRow needs no changes.
CREATE OR ALTER PROCEDURE dbo.spReport_SalesByCategory
    @StartDate DATETIME2,
    @EndDate   DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ct.ConcernType    AS Category,
           SUM(oi.Qty)       AS UnitsSold,
           SUM(oi.LineTotal) AS Revenue
    FROM   dbo.OrderItems oi
    JOIN   dbo.ProductCatalog p   ON p.productid     = oi.ProductId
    JOIN   dbo.ProductConcerns pc ON pc.productid    = p.productid
    JOIN   dbo.ConcernTypes ct    ON ct.ConcernTypeId = pc.concernID
    JOIN   dbo.Orders o           ON o.Id            = oi.OrderId
    WHERE  o.CreatedAt BETWEEN @StartDate AND @EndDate
      AND  o.Status NOT IN ('cancelled','refunded')
    GROUP BY ct.ConcernType
    ORDER BY Revenue DESC;
END;
GO

-- ── 8. Drop all sp_Category_* stored procedures ───────────────────────────────
IF OBJECT_ID('dbo.sp_Category_GetAllActive', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_GetAllActive;
IF OBJECT_ID('dbo.sp_Category_GetById',      'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_GetById;
IF OBJECT_ID('dbo.sp_Category_Create',       'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Create;
IF OBJECT_ID('dbo.sp_Category_Update',       'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Update;
IF OBJECT_ID('dbo.sp_Category_Deactivate',   'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Deactivate;
IF OBJECT_ID('dbo.sp_Category_Activate',     'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Activate;
GO

-- ── 9–11. Drop FK, column, and table ─────────────────────────────────────────
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_ProductCatalog_Category'
)
    ALTER TABLE dbo.ProductCatalog DROP CONSTRAINT FK_ProductCatalog_Category;
GO

IF OBJECT_ID('dbo.ConcernTypeCategories', 'U') IS NOT NULL
    DROP TABLE dbo.ConcernTypeCategories;
GO

IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_product_category'
)
    ALTER TABLE dbo.Productscatoalogs DROP CONSTRAINT FK_product_category;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Productscatoalogs') AND name = 'categoryid'
)
    ALTER TABLE dbo.Productscatoalogs DROP COLUMN categoryid;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.ProductCatalog') AND name = 'categoryid'
)
    ALTER TABLE dbo.ProductCatalog DROP COLUMN categoryid;
GO

IF OBJECT_ID('dbo.Category', 'U') IS NOT NULL
    DROP TABLE dbo.Category;
GO

PRINT 'Migration 042 complete - categories removed, concerns are the sole classification.';
