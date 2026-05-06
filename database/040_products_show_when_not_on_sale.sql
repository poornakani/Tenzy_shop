/*
    Migration 040: Show products when On Sale is false

    ProductCatalog.insale is used by the UI as the "On Sale" flag, so the
    storefront product list should not hide products when insale = 0.
    Product deletion is changed to physically remove product rows and children.
*/

CREATE OR ALTER PROCEDURE dbo.spProductCatalog_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.productid,
        p.name,
        p.brandid,
        b.name AS BrandName,
        p.categoryid,
        c.categorytype AS CategoryName,
        p.description,
        p.weight,
        p.TabletCount,
        p.ShowWeight,
        p.ShowTabletCount,
        p.insale,
        p.createdate,
        p.lastupdated,
        ISNULL(inv.stock, 0) AS StockQuantity,
        ISNULL(pr.price, 0) AS SellingPrice,
        ISNULL(pr.price, 0) AS OriginalPrice,
        ISNULL(pr.discountrate, 0) AS DiscountRate,
        pr.StartUTC,
        pr.EndUTC,
        (
            SELECT TOP 1 pi2.ImageUrl
            FROM dbo.ProductImages pi2
            WHERE pi2.productid = p.productid AND pi2.IsPrimary = 1 AND pi2.IsActive = 1
            ORDER BY pi2.SortOrder, pi2.ImageId
        ) AS PrimaryImageUrl,
        (
            SELECT STRING_AGG(CAST(pc.concernID AS NVARCHAR(20)), ',')
            FROM dbo.ProductConcerns pc
            WHERE pc.productid = p.productid
        ) AS ConcernTypeIdsCsv
    FROM dbo.ProductCatalog p
    LEFT JOIN dbo.Brand b ON b.Brandid = p.brandid AND b.Isactive = 1
    LEFT JOIN dbo.Category c ON c.CategoryId = p.categoryid AND c.IsActive = 1
    LEFT JOIN dbo.ProductInventory inv ON inv.ProductId = p.productid
    OUTER APPLY
    (
        SELECT TOP 1 pr1.*
        FROM dbo.ProductPricing pr1
        WHERE pr1.ProductId = p.productid
          AND (pr1.StartUTC IS NULL OR pr1.StartUTC <= SYSUTCDATETIME())
          AND (pr1.EndUTC IS NULL OR pr1.EndUTC > SYSUTCDATETIME())
        ORDER BY pr1.StartUTC DESC, pr1.PricingId DESC
    ) pr
    ORDER BY p.productid DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spProductCatalog_Deactivate
    @ProductId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL
        DELETE FROM dbo.ProductPaymentOptions WHERE productid = @ProductId;

    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL
        DELETE FROM dbo.ProductConcerns WHERE productid = @ProductId;

    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL
        DELETE FROM dbo.ProductFAQ WHERE productid = @ProductId;

    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL
        DELETE FROM dbo.ProductImages WHERE productid = @ProductId;

    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL
        DELETE FROM dbo.ProductPricing WHERE ProductId = @ProductId;

    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL
        DELETE FROM dbo.ProductInventory WHERE ProductId = @ProductId;

    IF OBJECT_ID('dbo.ProductReviews', 'U') IS NOT NULL
        DELETE FROM dbo.ProductReviews WHERE ProductId = @ProductId;

    IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL
        DELETE FROM dbo.OrderItems WHERE ProductId = @ProductId;

    DELETE FROM dbo.ProductCatalog WHERE productid = @ProductId;

    DECLARE @Rows INT = @@ROWCOUNT;

    COMMIT TRAN;

    SELECT @Rows AS RowsDeleted;
END;
GO

PRINT 'Migration 040 complete - products show when On Sale is false and delete removes products.';
