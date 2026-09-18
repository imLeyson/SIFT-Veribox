export type Craft =
  | "packaging"
  | "product"
  | "brand"
  | "graphic"
  | "app"
  | "miniprogram"
  | "interaction"
  | "web"
  | "unknown";

const LABEL: Record<Craft, string> = {
  packaging: "包装",
  product: "产品外观",
  brand: "品牌视觉",
  graphic: "平面",
  app: "App 界面",
  miniprogram: "小程序",
  interaction: "交互",
  web: "网页 / SaaS",
  unknown: "还不确定工种",
};

export function inferCraft(...parts: string[]): Craft {
  const t = parts.join(" ").toLowerCase();
  if (/小程序/.test(t)) return "miniprogram";
  if (/交互|动效|手势|反馈|任务路径|流程体验/.test(t) && !/包装|瓶|盒/.test(t)) {
    return "interaction";
  }
  if (/app|界面|ui\b|ux\b|线框|原型|空状态|组件/.test(t)) return "app";
  if (/官网|落地页|网页|网站|saas|后台/.test(t)) return "web";
  if (/包装|瓶身|瓶型|罐装|盒型|货架/.test(t)) return "packaging";
  if (/工业设计|产品外观|cmf|手板/.test(t)) return "product";
  if (/logo|vi\b|品牌视觉|视觉识别/.test(t)) return "brand";
  if (/海报|平面|排版|字体设计/.test(t)) return "graphic";
  return "unknown";
}

export function craftLabel(craft: Craft) {
  return LABEL[craft];
}

export function craftGuide(craft: Craft): string {
  switch (craft) {
    case "packaging":
      return "这是包装。步骤可以是货架、瓶型、盒、材质、摆拍。";
    case "product":
      return "这是产品外观。步骤可以是形态、CMF、按键、握持、使用场景。不要写成 App 页面。";
    case "brand":
      return "这是品牌视觉。步骤可以是字体、色彩、应用场景、同类品牌。不要默认写瓶型。";
    case "graphic":
      return "这是平面。步骤可以是字体、版式、图片风格、印刷品应用。";
    case "app":
      return "这是 App。步骤必须是页面和流程：首页、列表、详情、空状态、组件。禁止货架、瓶型、材质特写。";
    case "miniprogram":
      return "这是小程序。步骤可以是首页、核心任务、授权、分享、组件。禁止货架、瓶型。国内站可以靠前。";
    case "interaction":
      return "这是交互。步骤可以是任务路径、反馈、加载失败、动效、手势。禁止货架、瓶型、氛围图。";
    case "web":
      return "这是网页/SaaS。步骤可以是官网结构、落地页、工作台、设置页、竞品站。";
    default:
      return "先根据 Brief 判断工种，再出步骤。不要默认当成包装或护肤。";
  }
}
