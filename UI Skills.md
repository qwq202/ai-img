---
name: ui-skills
description: 为使用代理构建更佳界面而设的主观约束。
---
# UI 技能
为使用代理构建更佳界面而设的主观约束。

## Stack
- 必须在使用自定义值之前，先使用 Tailwind CSS 的默认值（间距、圆角、阴影）。
- 必须在需要 JavaScript 动画时使用 `motion/react`（原 `framer-motion`）。
- 建议使用 `tw-animate-css` 在 Tailwind CSS 中实现进入动画和微动画。
- 必须使用 `cn` 工具（`clsx` + `tailwind-merge`）来处理类名逻辑。

## Components
- 必须为任何涉及键盘或焦点行为的元素使用可访问的组件原语（`Base UI`、`React Aria`、`Radix`）。
- 必须优先使用项目已有的组件原语。
- 同一交互面内绝不能混用不同的原语系统。
- 若与技术栈兼容，建议优先使用 [`Base UI`](https://base-ui.com/react/components) 作为新原语。
- 必须为仅包含图标的按钮添加 `aria-label`。
- 除非明确要求，绝不能手动重新实现键盘或焦点行为。

## Interaction
- 必须对破坏性或不可逆的操作使用 `AlertDialog`。
- 建议使用结构化骨架屏来呈现加载状态。
- 绝不能使用 `h-screen`，请使用 `h-dvh`。
- 必须为固定元素考虑 `safe-area-inset`。
- 必须在错误发生的具体位置旁边展示错误信息。
- 绝不能阻止在 `input` 或 `textarea` 元素中的粘贴操作。

## Animation
- 绝不能添加动画，除非有明确的需求说明。
- 必须仅对合成层属性进行动画（`transform`、`opacity`）。
- 绝不能对布局属性进行动画（`width`、`height`、`top`、`left`、`margin`、`padding`）。
- 建议避免对绘制属性进行动画（`background`、`color`），除非是小范围、局部的 UI（文字、图标）。
- 建议在进入动画中使用 `ease-out`。
- 绝不能让交互反馈动画超过 `200ms`。
- 必须在元素离屏时暂停循环动画。
- 必须尊重 `prefers-reduced-motion` 设置。
- 绝不能引入自定义缓动曲线，除非有明确要求。
- 建议避免对大型图片或全屏区域进行动画。

## Typography
- 必须对标题使用 `text-balance`，对正文/段落使用 `text-pretty`。
- 必须对数据使用 `tabular-nums`。
- 建议对密集 UI 使用 `truncate` 或 `line-clamp`。
- 除非明确要求，绝不能修改 `letter-spacing`（`tracking-`）。

## Layout
- 必须使用固定的 `z-index` 量表（不要使用任意的 `z-x`）。
- 建议对正方形元素使用 `size-x`，而不是组合 `w-x` + `h-x`。

## Performance
- 绝不能对大型 `blur()` 或 `backdrop-filter` 区域进行动画。
- 绝不能在非活跃动画中使用 `will-change`。
- 绝不能为任何可以用渲染逻辑表达的情况使用 `useEffect`。

## Design
- 绝不能使用渐变，除非有明确要求。
- 绝不能使用紫色或多色渐变。
- 绝不能将光晕效果作为主要的交互暗示。
- 建议使用 Tailwind CSS 默认的阴影量表，除非有明确要求。
- 必须为空状态提供一个明确的下一步操作。
- 建议每个视图的强调色使用不超过一种。
- 建议在引入新颜色之前，先使用已有的主题或 Tailwind CSS 色彩 token。