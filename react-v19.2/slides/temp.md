---
marp: true
size: 16:9
theme: my-slide
paginate: true
style: |
  @import "./styles/bulma.min.css";
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  td {
    min-width: 100px;
    word-wrap: break-word;
  }
  img[alt~="center"] {
  display: block;
  margin: 0 auto;
  }
header: '<span class="tag is-info is-light is-large"> JSX 語法</span>'
footer: '
  <span class="tag is-link is-medium">RCC</span>'
---

<!-- _header: '' -->
<!-- _footer: '' -->

![bg right](./imgs/u7232347172_Neonpunk_style_A_futuristic_advertisement_on_a_hi_b9a47acc-d5e3-4df9-820f-653bb2b4ae75_1.png)

# Activity 元件(邊界)

## Eddy Chang

✉️ hello@eddychang.me

---

# 什麼是 JSX (What)

123

---

# 為什麼用 JSX (Why)

> 🚀 讓開發者延續使用已熟悉的技能專長(HTML/CSS/JS)，大幅簡化建立 Virtual DOM(虛擬 DOM)的語法撰寫，尤其是針對複雜的巢狀元素結構


```jsx

const element = (
  <ul>
    <li>item1</li>
  </ul>
)
```

---

# 參考資料 & 相關工具

- reactjs.org: [介紹 JSX](https://transform.tools/html-to-jsx)
- react.dev: [JSX (中)](https://zh-hans.react.dev/learn/writing-markup-with-jsx), [JSX (英)](https://react.dev/learn/writing-markup-with-jsx)
- react.dev: [條件渲染(Conditional Rendering)(中)](https://zh-hans.react.dev/learn/conditional-rendering)
- [HTML to JSX 線上轉換工具](https://transform.tools/html-to-jsx)
