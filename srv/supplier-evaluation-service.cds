using { my.sidebyside as db } from '../db/schema';

/**
 * サプライヤー評価ポータル サービス
 * 品質・納期・価格・対応力の4軸でサプライヤーを多面評価
 */
service SupplierEvaluationService @(path: '/evaluation') {

  @odata.draft.enabled
  entity Suppliers   as projection on db.Suppliers;
  entity Evaluations as projection on db.Evaluations;
}
