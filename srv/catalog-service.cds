using my.sidebyside as db from '../db/schema';

service CatalogService @(path: '/catalog') {
  entity Products as projection on db.Products;
}
