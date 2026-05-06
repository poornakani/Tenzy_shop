/*
    Supply chain UK purchase shops reference table

    Creates dbo.SupplyShops and seeds the initial UK purchase shop list:
      Boots, Tesco, Costco

    API contract expected by the frontend:
      GET  /api/admin/supply-chain/shops
      POST /api/admin/supply-chain/shops
        body: { shopId: number, shopName: string }
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRAN;

    IF OBJECT_ID('dbo.SupplyShops', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.SupplyShops
        (
            ShopId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SupplyShops PRIMARY KEY,
            ShopName NVARCHAR(150) NOT NULL,
            IsActive BIT NOT NULL CONSTRAINT DF_SupplyShops_IsActive DEFAULT (1),
            CreatedUtc DATETIME2(0) NOT NULL CONSTRAINT DF_SupplyShops_CreatedUtc DEFAULT (SYSUTCDATETIME()),
            UpdatedUtc DATETIME2(0) NULL
        );

        CREATE UNIQUE INDEX UX_SupplyShops_ShopName
            ON dbo.SupplyShops(ShopName);
    END;

    IF OBJECT_ID('dbo.SupplyProcurements', 'U') IS NOT NULL
       AND COL_LENGTH('dbo.SupplyProcurements', 'ShopId') IS NULL
    BEGIN
        ALTER TABLE dbo.SupplyProcurements ADD ShopId INT NULL;

        ALTER TABLE dbo.SupplyProcurements WITH CHECK
        ADD CONSTRAINT FK_SupplyProcurements_SupplyShops
        FOREIGN KEY (ShopId) REFERENCES dbo.SupplyShops(ShopId);
    END;

    MERGE dbo.SupplyShops AS target
    USING (VALUES
        (N'Boots'),
        (N'Tesco'),
        (N'Costco')
    ) AS source(ShopName)
    ON target.ShopName = source.ShopName
    WHEN MATCHED THEN
        UPDATE SET IsActive = 1, UpdatedUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (ShopName, IsActive)
        VALUES (source.ShopName, 1);

    COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    THROW;
END CATCH;
