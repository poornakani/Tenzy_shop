/*
    Migration 043: Concern type reads after category removal

    Categories were removed in migration 042. The concern type read procedures
    must no longer query ConcernTypeCategories or Category.
*/

CREATE OR ALTER PROCEDURE dbo.sp_ConcernType_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ct.ConcernTypeId,
        ct.ConcernType AS Name,
        ct.description AS Description,
        ct.IsActive,
        CAST(NULL AS NVARCHAR(MAX)) AS CategoryIdsCsv,
        CAST(NULL AS NVARCHAR(MAX)) AS CategoryNamesCsv
    FROM dbo.ConcernTypes ct
    ORDER BY ct.ConcernType;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ConcernType_GetById
    @ConcernTypeId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ct.ConcernTypeId,
        ct.ConcernType AS Name,
        ct.description AS Description,
        ct.IsActive,
        CAST(NULL AS NVARCHAR(MAX)) AS CategoryIdsCsv,
        CAST(NULL AS NVARCHAR(MAX)) AS CategoryNamesCsv
    FROM dbo.ConcernTypes ct
    WHERE ct.ConcernTypeId = @ConcernTypeId;
END;
GO

PRINT 'Migration 043 complete - concern reads no longer reference categories.';
