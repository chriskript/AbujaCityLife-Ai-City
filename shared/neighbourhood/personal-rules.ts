// Mechanical rules, not a priority policy. Higher values mean unmet needs.
export const personalRules={intervalSeconds:60,foodIncrease:.08,activeFatigueIncrease:.08,otherFatigueIncrease:.04,mealRelief:.8,restReliefPerSecond:.01,workIncomeRelief:.3} as const;
export function carriedGoods(goods:number,food:number,cargo:number){
  return {total:goods,personalFood:food,committedCargo:cargo,restockable:Math.max(0,goods-food-cargo),foodIsSubsetOfTotal:true};
}
