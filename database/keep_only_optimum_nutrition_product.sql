/*
    Keep only Optimum Nutrition Micronised Creatine Monohydrate.

    Deletes product child rows and catalog rows for every other product, then
    ensures the kept product is active/visible.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @KeepName NVARCHAR(250) = 'Optimum Nutrition Micronised Creatine Monohydrate';
DECLARE @KeepProductId INT = (
    SELECT TOP 1 productid
    FROM dbo.ProductCatalog
    WHERE LTRIM(RTRIM(name)) = @KeepName
    ORDER BY productid DESC
);

IF @KeepProductId IS NULL
BEGIN
    RAISERROR('Product to keep was not found: %s', 16, 1, @KeepName);
    RETURN;
END;

BEGIN TRY
    BEGIN TRAN;

    IF OBJECT_ID('dbo.ProductPaymentOptions', 'U') IS NOT NULL
        DELETE FROM dbo.ProductPaymentOptions WHERE productid <> @KeepProductId;

    IF OBJECT_ID('dbo.ProductConcerns', 'U') IS NOT NULL
        DELETE FROM dbo.ProductConcerns WHERE productid <> @KeepProductId;

    IF OBJECT_ID('dbo.ProductFAQ', 'U') IS NOT NULL
        DELETE FROM dbo.ProductFAQ WHERE productid <> @KeepProductId;

    IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL
        DELETE FROM dbo.ProductImages WHERE productid <> @KeepProductId;

    IF OBJECT_ID('dbo.ProductPricing', 'U') IS NOT NULL
        DELETE FROM dbo.ProductPricing WHERE ProductId <> @KeepProductId;

    IF OBJECT_ID('dbo.ProductInventory', 'U') IS NOT NULL
        DELETE FROM dbo.ProductInventory WHERE ProductId <> @KeepProductId;

    IF OBJECT_ID('dbo.ProductReviews', 'U') IS NOT NULL
        DELETE FROM dbo.ProductReviews WHERE ProductId <> @KeepProductId;

    IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL
        DELETE FROM dbo.OrderItems WHERE ProductId <> @KeepProductId;

    DELETE FROM dbo.ProductCatalog
    WHERE productid <> @KeepProductId;

    UPDATE dbo.ProductCatalog
    SET insale = 1,
        lastupdated = SYSUTCDATETIME()
    WHERE productid = @KeepProductId;

    COMMIT TRAN;

    SELECT productid, name, insale
    FROM dbo.ProductCatalog
    ORDER BY productid;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    THROW;
END CATCH;
