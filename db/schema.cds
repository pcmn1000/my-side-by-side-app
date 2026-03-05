namespace my.sidebyside;

using { cuid, managed } from '@sap/cds/common';

entity Products : cuid, managed {
  name        : String(100) @mandatory;
  description : String(500);
  price       : Decimal(10,2);
  currency    : String(3);
  stock       : Integer;
}

// ===== サプライヤー評価ポータル =====

/**
 * サプライヤーマスター
 * 本番環境では S/4HANA の API_BUSINESS_PARTNER (Released API) から取得想定
 */
entity Suppliers : cuid, managed {
  supplierID         : String(10) @mandatory;
  name               : String(200) @mandatory;
  country            : String(3);
  city               : String(100);
  category           : String(50);
  overallScore       : Decimal(3,1) default 0;
  qualityScore       : Decimal(3,1) default 0;
  deliveryScore      : Decimal(3,1) default 0;
  priceScore         : Decimal(3,1) default 0;
  responseScore      : Decimal(3,1) default 0;
  riskLevel          : String(10) default 'Medium';
  status             : String(20) default 'Active';
  evaluationCount    : Integer default 0;
  overallCriticality : Integer default 0;
  riskCriticality    : Integer default 0;
  evaluations        : Composition of many Evaluations on evaluations.supplier = $self;
}

/**
 * サプライヤー評価レコード
 * 各部門の担当者がサプライヤーを4軸（品質・納期・価格・対応力）で評価
 */
entity Evaluations : cuid, managed {
  supplier           : Association to Suppliers;
  period             : String(7);
  department         : String(50);
  evaluator          : String(100);
  qualityScore       : Integer;
  deliveryScore      : Integer;
  priceScore         : Integer;
  responseScore      : Integer;
  overallScore       : Decimal(3,1);
  overallCriticality : Integer default 0;
  comment            : String(1000);
  status             : String(20) default 'Draft';
}
