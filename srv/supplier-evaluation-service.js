const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { Suppliers, Evaluations } = this.entities;

  /**
   * ドラフト保存（Activate）後にサプライヤーのスコアを再計算
   * - 各評価の overallScore を算出
   * - サプライヤーの集計スコア・リスクレベルを更新
   */
  this.after('SAVE', 'Suppliers', async (data, req) => {
    try {
      // 1. 個別評価の overallScore を計算・更新
      const evals = await SELECT.from(Evaluations).where({ supplier_ID: data.ID });

      for (const e of evals) {
        if (e.qualityScore && e.deliveryScore && e.priceScore && e.responseScore) {
          const os = (e.qualityScore + e.deliveryScore + e.priceScore + e.responseScore) / 4;
          const oc = os >= 4.0 ? 3 : os >= 3.0 ? 2 : 1;
          await UPDATE(Evaluations, e.ID).with({
            overallScore: parseFloat(os.toFixed(1)),
            overallCriticality: oc,
            status: 'Submitted'
          });
        }
      }

      // 2. サプライヤー集計スコアの再計算
      const updatedEvals = await SELECT.from(Evaluations).where({ supplier_ID: data.ID });

      if (updatedEvals.length === 0) {
        await UPDATE(Suppliers, data.ID).with({
          qualityScore: 0, deliveryScore: 0, priceScore: 0, responseScore: 0,
          overallScore: 0, overallCriticality: 0,
          riskLevel: 'Medium', riskCriticality: 2,
          evaluationCount: 0
        });
        return;
      }

      const avg = (key) => updatedEvals.reduce((s, e) => s + (e[key] || 0), 0) / updatedEvals.length;
      const qs = avg('qualityScore');
      const ds = avg('deliveryScore');
      const ps = avg('priceScore');
      const rs = avg('responseScore');
      const os = (qs + ds + ps + rs) / 4;

      let riskLevel = 'Medium';
      if (os >= 4.0) riskLevel = 'Low';
      else if (os < 3.0) riskLevel = 'High';

      await UPDATE(Suppliers, data.ID).with({
        qualityScore:       parseFloat(qs.toFixed(1)),
        deliveryScore:      parseFloat(ds.toFixed(1)),
        priceScore:         parseFloat(ps.toFixed(1)),
        responseScore:      parseFloat(rs.toFixed(1)),
        overallScore:       parseFloat(os.toFixed(1)),
        overallCriticality: os >= 4.0 ? 3 : os >= 3.0 ? 2 : 1,
        riskLevel,
        riskCriticality:    riskLevel === 'Low' ? 3 : riskLevel === 'High' ? 1 : 2,
        evaluationCount:    updatedEvals.length
      });

      req.info(`サプライヤー ${data.name} のスコアを再計算しました（評価数: ${updatedEvals.length}）`);
    } catch (err) {
      req.error(500, `スコア再計算エラー: ${err.message}`);
    }
  });
});
