using SupplierEvaluationService as service from '../../srv/supplier-evaluation-service';

// ============================================================
// サプライヤー エンティティ アノテーション
// ============================================================
annotate service.Suppliers with @(
  UI: {
    // ---- ヘッダー情報 ----
    HeaderInfo: {
      TypeName:       'サプライヤー',
      TypeNamePlural: 'サプライヤー評価リスト',
      Title:          { Value: name },
      Description:    { Value: supplierID }
    },

    // ---- フィルターバー ----
    SelectionFields: [ category, country, riskLevel, status ],

    // ---- リストレポート テーブル ----
    LineItem: [
      { Value: supplierID,      Label: '仕入先コード',  ![@UI.Importance]: #High },
      { Value: name,            Label: 'サプライヤー名', ![@UI.Importance]: #High },
      { Value: category,        Label: 'カテゴリ' },
      { Value: country,         Label: '国' },
      { Value: overallScore,    Label: '総合スコア',     Criticality: overallCriticality, ![@UI.Importance]: #High },
      { Value: qualityScore,    Label: '品質' },
      { Value: deliveryScore,   Label: '納期' },
      { Value: priceScore,      Label: '価格' },
      { Value: responseScore,   Label: '対応力' },
      { Value: riskLevel,       Label: 'リスク',         Criticality: riskCriticality },
      { Value: evaluationCount, Label: '評価数' }
    ],

    // ---- デフォルトソート（総合スコア降順）----
    PresentationVariant: {
      SortOrder: [{ Property: overallScore, Descending: true }],
      Visualizations: ['@UI.LineItem']
    },

    // ---- オブジェクトページ ヘッダー ----
    HeaderFacets: [
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#OverallScore' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#RiskLevel' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Status' }
    ],

    DataPoint#OverallScore: {
      Value:       overallScore,
      Title:       '総合スコア',
      Criticality: overallCriticality,
      TargetValue: 5,
      Visualization: #Rating
    },
    DataPoint#RiskLevel: {
      Value:       riskLevel,
      Title:       'リスクレベル',
      Criticality: riskCriticality
    },
    DataPoint#Status: {
      Value: status,
      Title: 'ステータス'
    },

    // ---- オブジェクトページ セクション ----
    Facets: [
      {
        $Type:  'UI.CollectionFacet',
        ID:     'GeneralInfoSection',
        Label:  '基本情報',
        Facets: [
          { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#GeneralInfo' }
        ]
      },
      {
        $Type:  'UI.CollectionFacet',
        ID:     'ScoresSection',
        Label:  '評価スコア',
        Facets: [
          { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Scores' }
        ]
      },
      {
        $Type:  'UI.ReferenceFacet',
        ID:     'EvaluationsSection',
        Target: 'evaluations/@UI.LineItem',
        Label:  '評価履歴'
      }
    ],

    // ---- フィールドグループ：基本情報 ----
    FieldGroup#GeneralInfo: {
      Data: [
        { Value: supplierID, Label: '仕入先コード' },
        { Value: name,       Label: 'サプライヤー名' },
        { Value: country,    Label: '国' },
        { Value: city,       Label: '都市' },
        { Value: category,   Label: 'カテゴリ' },
        { Value: status,     Label: 'ステータス' }
      ]
    },

    // ---- フィールドグループ：評価スコア ----
    FieldGroup#Scores: {
      Data: [
        { Value: overallScore,    Label: '総合スコア',  Criticality: overallCriticality },
        { Value: qualityScore,    Label: '品質スコア' },
        { Value: deliveryScore,   Label: '納期スコア' },
        { Value: priceScore,      Label: '価格スコア' },
        { Value: responseScore,   Label: '対応力スコア' },
        { Value: riskLevel,       Label: 'リスクレベル', Criticality: riskCriticality },
        { Value: evaluationCount, Label: '評価回数' }
      ]
    }
  }
);

// ---- フィールドラベル ----
annotate service.Suppliers with {
  supplierID      @title: '仕入先コード';
  name            @title: 'サプライヤー名';
  country         @title: '国';
  city            @title: '都市';
  category        @title: 'カテゴリ';
  overallScore    @title: '総合スコア';
  qualityScore    @title: '品質';
  deliveryScore   @title: '納期';
  priceScore      @title: '価格';
  responseScore   @title: '対応力';
  riskLevel       @title: 'リスク';
  status          @title: 'ステータス';
  evaluationCount @title: '評価数';
};


// ============================================================
// 評価 エンティティ アノテーション
// ============================================================
annotate service.Evaluations with @(
  UI: {
    HeaderInfo: {
      TypeName:       '評価',
      TypeNamePlural: '評価一覧',
      Title:          { Value: period },
      Description:    { Value: department }
    },

    // ---- 評価テーブル（Object Page のサブテーブル）----
    LineItem: [
      { Value: period,        Label: '評価期間' },
      { Value: department,    Label: '部門' },
      { Value: evaluator,     Label: '評価者' },
      { Value: qualityScore,  Label: '品質' },
      { Value: deliveryScore, Label: '納期' },
      { Value: priceScore,    Label: '価格' },
      { Value: responseScore, Label: '対応力' },
      { Value: overallScore,  Label: '総合', Criticality: overallCriticality },
      { Value: status,        Label: 'ステータス' }
    ],

    PresentationVariant: {
      SortOrder: [{ Property: period, Descending: true }],
      Visualizations: ['@UI.LineItem']
    },

    // ---- 評価詳細 ----
    Facets: [
      {
        $Type:  'UI.ReferenceFacet',
        Target: '@UI.FieldGroup#EvalDetail',
        Label:  '評価詳細'
      }
    ],

    FieldGroup#EvalDetail: {
      Data: [
        { Value: period,        Label: '評価期間' },
        { Value: department,    Label: '部門' },
        { Value: evaluator,     Label: '評価者' },
        { Value: qualityScore,  Label: '品質スコア (1-5)' },
        { Value: deliveryScore, Label: '納期スコア (1-5)' },
        { Value: priceScore,    Label: '価格スコア (1-5)' },
        { Value: responseScore, Label: '対応力スコア (1-5)' },
        { Value: overallScore,  Label: '総合スコア' },
        { Value: comment,       Label: 'コメント' },
        { Value: status,        Label: 'ステータス' }
      ]
    }
  }
);

// ---- フィールドラベル ----
annotate service.Evaluations with {
  period        @title: '評価期間';
  department    @title: '部門';
  evaluator     @title: '評価者';
  qualityScore  @title: '品質';
  deliveryScore @title: '納期';
  priceScore    @title: '価格';
  responseScore @title: '対応力';
  overallScore  @title: '総合スコア';
  comment       @title: 'コメント';
  status        @title: 'ステータス';
};
