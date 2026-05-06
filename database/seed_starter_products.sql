/*
    Restore starter products

    Inserts the original starter product catalog only when ProductCatalog is
    empty. User details and operational data are not touched.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRAN;

    IF NOT EXISTS (SELECT 1 FROM dbo.Category WHERE categorytype = 'Moisturizers')
        INSERT INTO dbo.Category (categorytype, IsActive) VALUES ('Moisturizers', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Category WHERE categorytype = 'Serums')
        INSERT INTO dbo.Category (categorytype, IsActive) VALUES ('Serums', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Category WHERE categorytype = 'Cleansers')
        INSERT INTO dbo.Category (categorytype, IsActive) VALUES ('Cleansers', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Category WHERE categorytype = 'Sun Care')
        INSERT INTO dbo.Category (categorytype, IsActive) VALUES ('Sun Care', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Category WHERE categorytype = 'Body Care')
        INSERT INTO dbo.Category (categorytype, IsActive) VALUES ('Body Care', 1);

    IF NOT EXISTS (SELECT 1 FROM dbo.Brand WHERE name = 'CeraVe')
        INSERT INTO dbo.Brand (name, barndimage, createdate, Isactive)
        VALUES ('CeraVe', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/CeraVe_logo.svg/320px-CeraVe_logo.svg.png', SYSUTCDATETIME(), 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Brand WHERE name = 'The Ordinary')
        INSERT INTO dbo.Brand (name, barndimage, createdate, Isactive)
        VALUES ('The Ordinary', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/The_Ordinary_logo.svg/320px-The_Ordinary_logo.svg.png', SYSUTCDATETIME(), 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Brand WHERE name = 'Neutrogena')
        INSERT INTO dbo.Brand (name, barndimage, createdate, Isactive)
        VALUES ('Neutrogena', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Neutrogena_logo.svg/320px-Neutrogena_logo.svg.png', SYSUTCDATETIME(), 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Brand WHERE name = 'Cetaphil')
        INSERT INTO dbo.Brand (name, barndimage, createdate, Isactive)
        VALUES ('Cetaphil', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Cetaphil_logo.svg/320px-Cetaphil_logo.svg.png', SYSUTCDATETIME(), 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Brand WHERE name = 'Aveeno')
        INSERT INTO dbo.Brand (name, barndimage, createdate, Isactive)
        VALUES ('Aveeno', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aveeno_logo.svg/320px-Aveeno_logo.svg.png', SYSUTCDATETIME(), 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.Brand WHERE name = 'Tenzy')
        INSERT INTO dbo.Brand (name, barndimage, createdate, Isactive)
        VALUES ('Tenzy', NULL, SYSUTCDATETIME(), 1);

    IF NOT EXISTS (SELECT 1 FROM dbo.ProductCatalog)
    BEGIN
        DECLARE @moisturizer  INT = (SELECT TOP 1 CategoryId FROM dbo.Category WHERE categorytype = 'Moisturizers');
        DECLARE @serum_cat    INT = (SELECT TOP 1 CategoryId FROM dbo.Category WHERE categorytype = 'Serums');
        DECLARE @cleanser_cat INT = (SELECT TOP 1 CategoryId FROM dbo.Category WHERE categorytype = 'Cleansers');
        DECLARE @suncare_cat  INT = (SELECT TOP 1 CategoryId FROM dbo.Category WHERE categorytype = 'Sun Care');
        DECLARE @body_cat     INT = (SELECT TOP 1 CategoryId FROM dbo.Category WHERE categorytype = 'Body Care');

        DECLARE @cerave   INT = (SELECT TOP 1 Brandid FROM dbo.Brand WHERE name = 'CeraVe');
        DECLARE @ordinary INT = (SELECT TOP 1 Brandid FROM dbo.Brand WHERE name = 'The Ordinary');
        DECLARE @neutro   INT = (SELECT TOP 1 Brandid FROM dbo.Brand WHERE name = 'Neutrogena');
        DECLARE @cetaphil INT = (SELECT TOP 1 Brandid FROM dbo.Brand WHERE name = 'Cetaphil');
        DECLARE @aveeno   INT = (SELECT TOP 1 Brandid FROM dbo.Brand WHERE name = 'Aveeno');
        DECLARE @tenzy    INT = (SELECT TOP 1 Brandid FROM dbo.Brand WHERE name = 'Tenzy');

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('CeraVe Moisturizing Cream', @cerave, @moisturizer,
                'A rich moisturizing cream with ceramides and hyaluronic acid to restore the skin''s natural barrier.',
                250.0, 1, SYSUTCDATETIME());
        DECLARE @p1 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p1, 45);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p1, 3200.00, 10.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p1, 'https://images.unsplash.com/photo-1620916566393-7c3a4a4f3f10?q=80&w=600', 1, 1);
        INSERT INTO dbo.ProductFAQ (productid, Question, Answer) VALUES (@p1, 'Is this suitable for sensitive skin?', 'Yes, it is fragrance-free and suitable for sensitive skin.');
        INSERT INTO dbo.ProductFAQ (productid, Question, Answer) VALUES (@p1, 'Can I use it on my face?', 'Yes, it is non-comedogenic and safe for facial use.');

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('Hyaluronic Acid 2% + B5', @ordinary, @serum_cat,
                'Multi-depth hydration serum with hyaluronic acid plus Vitamin B5 for immediate and lasting moisture.',
                30.0, 1, SYSUTCDATETIME());
        DECLARE @p2 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p2, 60);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p2, 1850.00, 0.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p2, 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=600', 1, 1);
        INSERT INTO dbo.ProductFAQ (productid, Question, Answer) VALUES (@p2, 'How often should I use this?', 'Apply twice daily, morning and evening, before moisturizer.');

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('Hydro Boost Gel Cream', @neutro, @moisturizer,
                'Oil-free gel-cream formula with hyaluronic acid that absorbs quickly to quench dry skin.',
                50.0, 1, SYSUTCDATETIME());
        DECLARE @p3 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p3, 38);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p3, 2750.00, 15.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p3, 'https://images.unsplash.com/photo-1629198726018-41b7b7a4b3b2?q=80&w=600', 1, 1);

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('Foaming Facial Cleanser', @cerave, @cleanser_cat,
                'Gentle foaming face wash for normal to oily skin with ceramides, niacinamide and hyaluronic acid.',
                473.0, 1, SYSUTCDATETIME());
        DECLARE @p4 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p4, 55);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p4, 2100.00, 0.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p4, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=600', 1, 1);

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('Ultra Sheer Dry-Touch SPF 50+', @neutro, @suncare_cat,
                'Lightweight, fast-absorbing sunscreen with broad-spectrum UVA/UVB protection.',
                88.0, 1, SYSUTCDATETIME());
        DECLARE @p5 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p5, 42);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p5, 2900.00, 5.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p5, 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=600', 1, 1);

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('Gentle Skin Cleanser', @cetaphil, @cleanser_cat,
                'Soap-free, fragrance-free gentle cleanser for all skin types.',
                500.0, 1, SYSUTCDATETIME());
        DECLARE @p6 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p6, 70);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p6, 1650.00, 0.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p6, 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=600', 1, 1);

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('Daily Moisturising Lotion', @aveeno, @body_cat,
                'Lightweight body lotion with natural colloidal oatmeal for dry, sensitive skin.',
                532.0, 1, SYSUTCDATETIME());
        DECLARE @p7 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p7, 50);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p7, 3500.00, 0.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p7, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600', 1, 1);

        INSERT INTO dbo.ProductCatalog (name, brandid, categoryid, description, weight, insale, createdate)
        VALUES ('Vitamin C Brightening Serum', @tenzy, @serum_cat,
                'Vitamin C serum with ferulic acid and hyaluronic acid to brighten skin and fade dark spots.',
                30.0, 1, SYSUTCDATETIME());
        DECLARE @p8 INT = SCOPE_IDENTITY();
        INSERT INTO dbo.ProductInventory (ProductId, stock) VALUES (@p8, 25);
        INSERT INTO dbo.ProductPricing (ProductId, price, discountrate, StartUTC) VALUES (@p8, 4200.00, 20.00, SYSUTCDATETIME());
        INSERT INTO dbo.ProductImages (productid, ImageUrl, IsPrimary, SortOrder) VALUES (@p8, 'https://images.unsplash.com/photo-1620916566393-7c3a4a4f3f10?q=80&w=600', 1, 1);
        INSERT INTO dbo.ProductFAQ (productid, Question, Answer) VALUES (@p8, 'Does this serum oxidise quickly?', 'Store in a cool, dark place and use within 3 months of opening.');
    END

    COMMIT TRAN;

    SELECT COUNT(*) AS ProductCount FROM dbo.ProductCatalog;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    THROW;
END CATCH;

