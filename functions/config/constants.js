function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

define("NAME", "name");
define("CATEGORY", "category");
define("FOOD", "food");
define("DESCRIPTION", "description");
define("IS_ACTIVE", "isActive");
define("CREATED_DATE", "createdDate");
define("LAST_UPDATED_DATE", "lastUpdatedDate");
define("TOTAL_CATEGORIES", "totalCategories");
define("TOTAL_PRODUCTS", "totalProducts");
//define("FOOD", "food");

