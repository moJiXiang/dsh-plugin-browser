window.__ModuleLoader__.load({
	id: "dsh-plugin-browser",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/panel.tsx
var import_react4 = require("react");

// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
var import_react3 = require("react");

// node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
var toKebabCase = (string) => string?.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

// node_modules/lucide-react/dist/esm/shared/src/utils/toLucideIconData.mjs
function toLucideIconData(iconName, iconNode, aliases = []) {
  if (iconNode == null) {
    throw new Error("[lucide]: iconNode is required when icon name is used");
  }
  return {
    name: toKebabCase(iconName),
    size: 24,
    node: iconNode,
    ...aliases.length > 0 ? { aliases } : {}
  };
}

// node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
var toCamelCase = (string) => {
  let out = "";
  let upperNext = false;
  for (const ch of string) {
    if (ch === "-" || ch === "_" || ch <= " ") {
      upperNext = out.length > 0;
      continue;
    }
    if (out.length === 0) {
      out += ch.toLowerCase();
    } else {
      out += upperNext ? ch.toUpperCase() : ch;
    }
    upperNext = false;
  }
  return out;
};

// node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

// node_modules/lucide-react/dist/esm/Icon.mjs
var import_react2 = require("react");

// node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();

// node_modules/lucide-react/dist/esm/shared/src/build/defaultAttributes.mjs
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};

// node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconNode.mjs
function isDefined(value) {
  return value !== null && value !== void 0;
}
function buildLucideIconNode(icon, params = {}) {
  const attributeNames = params.attributeNames ?? {};
  const getAttributeName = (attributeName) => attributeNames[attributeName] ?? attributeName;
  const viewBoxWidth = icon.size ?? icon.width ?? defaultAttributes["width"];
  const viewBoxHeight = icon.size ?? icon.height ?? defaultAttributes["height"];
  const aliasClassNames = icon.aliases?.filter((alias) => typeof alias === "string" && alias.trim() !== "").map((alias) => `lucide-${alias}`) ?? [];
  const iconClassNames = [...icon.name ? [`lucide-${icon.name}`] : [], ...aliasClassNames];
  const classNamesFromClassName = params.className?.split(" ").filter(Boolean) ?? [];
  const className = params.includeDefaultClasses === false ? mergeClasses(...classNamesFromClassName) : mergeClasses("lucide", ...iconClassNames, ...classNamesFromClassName);
  const calculatedStrokeWidth = params.absoluteStrokeWidth ? Number(params.strokeWidth ?? defaultAttributes["stroke-width"]) * Number(icon.size ?? icon.width ?? defaultAttributes["width"]) / Number(params.size ?? params.width ?? defaultAttributes["width"]) : params.strokeWidth ?? defaultAttributes["stroke-width"];
  const attributes = {
    ...Object.entries(defaultAttributes).reduce((attrs, [attrName, value]) => {
      attrs[getAttributeName(attrName)] = value;
      return attrs;
    }, {}),
    ..."color" in params && params.color && {
      [getAttributeName("stroke")]: params.color
    },
    ..."size" in params && isDefined(params.size) && {
      [getAttributeName("width")]: params.size,
      [getAttributeName("height")]: params.size
    },
    ..."width" in params && isDefined(params.width) && {
      [getAttributeName("width")]: params.width
    },
    ..."height" in params && isDefined(params.height) && {
      [getAttributeName("height")]: params.height
    },
    [getAttributeName("stroke-width")]: calculatedStrokeWidth,
    ...className && {
      [getAttributeName("class")]: className
    },
    [getAttributeName("viewBox")]: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
    ...params.hasA11yProp === false ? {
      [getAttributeName("aria-hidden")]: "true"
    } : {},
    ..."attributes" in params && params.attributes
  };
  return [
    "svg",
    attributes,
    icon.node.map((child) => {
      const [name, attrs, children] = child;
      const nextAttrs = params.nonScalingStroke ? { [getAttributeName("vector-effect")]: "non-scaling-stroke", ...attrs } : attrs;
      return children ? [name, nextAttrs, children] : [name, nextAttrs];
    })
  ];
}

// node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconForReact.mjs
function buildLucideIconForReact(icon, params = {}) {
  return buildLucideIconNode(icon, {
    ...params,
    attributeNames: {
      ...params.attributeNames,
      class: "className",
      "stroke-width": "strokeWidth",
      "stroke-linecap": "strokeLinecap",
      "stroke-linejoin": "strokeLinejoin",
      "vector-effect": "vectorEffect"
    }
  });
}

// node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};

// node_modules/lucide-react/dist/esm/context.mjs
var import_react = require("react");
var LucideContext = (0, import_react.createContext)({});
var useLucideContext = () => (0, import_react.useContext)(LucideContext);

// node_modules/lucide-react/dist/esm/Icon.mjs
var Icon = (0, import_react2.forwardRef)(
  ({
    color,
    size,
    width,
    height,
    strokeWidth,
    absoluteStrokeWidth,
    nonScalingStroke,
    className = "",
    children,
    iconNode = [],
    icon = {
      node: iconNode,
      aliases: [],
      size: 24
    },
    ...rest
  }, ref) => {
    const {
      size: contextSize = 24,
      strokeWidth: contextStrokeWidth = 2,
      absoluteStrokeWidth: contextAbsoluteStrokeWidth = false,
      nonScalingStroke: contextNonScalingStroke = false,
      color: contextColor = "currentColor",
      className: contextClass = ""
    } = useLucideContext() ?? {};
    const hasAccessibleProp = Boolean(children) || hasA11yProp(rest);
    const [name, svgAttributes, builtIconNode = []] = buildLucideIconForReact(icon, {
      color: color ?? contextColor,
      width: width ?? size ?? contextSize,
      height: height ?? size ?? contextSize,
      strokeWidth: strokeWidth ?? contextStrokeWidth,
      absoluteStrokeWidth: absoluteStrokeWidth ?? contextAbsoluteStrokeWidth,
      nonScalingStroke: nonScalingStroke ?? contextNonScalingStroke,
      className: mergeClasses(contextClass, className),
      hasA11yProp: hasAccessibleProp,
      attributes: rest
    });
    return (0, import_react2.createElement)(
      name,
      {
        ref,
        ...svgAttributes
      },
      [
        ...builtIconNode.map(([tag, attrs]) => (0, import_react2.createElement)(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    );
  }
);

// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
function createLucideIcon(iconDataOrName, iconNode = [], aliases = []) {
  const iconData = typeof iconDataOrName === "string" ? toLucideIconData(iconDataOrName, iconNode, aliases) : iconDataOrName;
  const Component = (0, import_react3.forwardRef)(
    ({ className, ...props }, ref) => (0, import_react3.createElement)(Icon, {
      ref,
      icon: iconData,
      className,
      ...props
    })
  );
  if (iconData.name) {
    Component.displayName = toPascalCase(iconData.name);
  }
  return Component;
}

// node_modules/lucide-react/dist/esm/icons/mouse-pointer-click.mjs
var __iconData = {
  name: "mouse-pointer-click",
  size: 24,
  node: [
    ["path", { d: "M14 4.1 12 6", key: "ita8i4" }],
    ["path", { d: "m5.1 8-2.9-.8", key: "1go3kf" }],
    ["path", { d: "m6 12-1.9 2", key: "mnht97" }],
    ["path", { d: "M7.2 2.2 8 5.1", key: "1cfko1" }],
    [
      "path",
      {
        d: "M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z",
        key: "s0h3yz"
      }
    ]
  ]
};
__iconData.node;
var MousePointerClick = createLucideIcon(__iconData);

// src/client/panel.tsx
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
var PANEL_STYLES = `
.dsh-browser-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  height: 28px; min-width: 28px; padding: 0; border: none; border-radius: 7px;
  background: transparent; color: inherit; cursor: pointer; flex: none;
  font-size: 12px; line-height: 1;
}
.dsh-browser-btn:hover { background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent)); }
.dsh-browser-btn:active { background: color-mix(in srgb, currentColor 16%, transparent); }
.dsh-browser-btn:focus-visible { outline: 2px solid color-mix(in srgb, currentColor 35%, transparent); outline-offset: -2px; }
.dsh-browser-btn[data-on="1"] {
  color: #3b82f6; font-weight: 600;
  background: color-mix(in srgb, #3b82f6 12%, transparent);
}
.dsh-browser-url {
  flex: 1; min-width: 60px; height: 30px; font-size: 12px; padding: 0 12px;
  border: none; border-radius: 8px; background: color-mix(in srgb, currentColor 6%, transparent);
  color: inherit; text-overflow: ellipsis;
}
.dsh-browser-url:hover { background: color-mix(in srgb, currentColor 9%, transparent); }
.dsh-browser-url:focus { outline: none; background: color-mix(in srgb, currentColor 10%, transparent); }
.dsh-browser-url::placeholder { color: color-mix(in srgb, currentColor 45%, transparent); }
`;
async function postCommand(command) {
  const response = await fetch("/dsh-browser/api/cmd", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(command)
  });
  return await response.json();
}
function BrowserPanel(props) {
  const { insertElement, watchComposer } = props;
  const { tab } = props.useTabInfo();
  const canvasRef = (0, import_react4.useRef)(null);
  const stageRef = (0, import_react4.useRef)(null);
  const scaleRef = (0, import_react4.useRef)({ width: 1280, height: 800 });
  const lastMouseRef = (0, import_react4.useRef)({ x: 640, y: 400 });
  const resizeTimer = (0, import_react4.useRef)(void 0);
  const noticeTimer = (0, import_react4.useRef)(void 0);
  const [status, setStatus] = (0, import_react4.useState)(null);
  const [connected, setConnected] = (0, import_react4.useState)(false);
  const [picking, setPicking] = (0, import_react4.useState)(false);
  const [notice, setNotice] = (0, import_react4.useState)("");
  const [urlFocused, setUrlFocused] = (0, import_react4.useState)(false);
  const [urlDraft, setUrlDraft] = (0, import_react4.useState)("");
  const flashNotice = (0, import_react4.useCallback)((text) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 4e3);
  }, []);
  const drawFrame = (0, import_react4.useCallback)((base64) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = new Image();
    image.onload = () => {
      if (canvasRef.current !== canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      scaleRef.current = { width: image.naturalWidth, height: image.naturalHeight };
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0);
    };
    image.src = `data:image/jpeg;base64,${base64}`;
  }, []);
  const handlePick = (0, import_react4.useCallback)((pick) => {
    try {
      const label = insertElement(pick);
      flashNotice(`${label} \u5DF2\u63D2\u5165\u8F93\u5165\u6846\uFF0C\u50CF\u5F15\u7528\u6587\u4EF6\u4E00\u6837\u5728\u53E5\u5B50\u91CC\u5F15\u7528\u5B83`);
    } catch (error) {
      flashNotice(`\u63D2\u5165\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`);
    }
  }, [insertElement, flashNotice]);
  (0, import_react4.useEffect)(() => {
    if (!tab.visible) return void 0;
    const source = new EventSource("/dsh-browser/api/stream");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("status", (event) => {
      const next = JSON.parse(event.data);
      setStatus(next);
      if (!urlFocused) setUrlDraft(next.url);
    });
    source.addEventListener("frame", (event) => {
      drawFrame(event.data);
    });
    source.addEventListener("pick", (event) => {
      handlePick(JSON.parse(event.data));
    });
    return () => {
      source.close();
      setConnected(false);
    };
  }, [tab.visible, drawFrame, handlePick, urlFocused]);
  (0, import_react4.useEffect)(() => {
    const stage = stageRef.current;
    if (!stage) return void 0;
    const post = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width < 40 || height < 40) return;
      void postCommand({ type: "resize", width, height, dpr: window.devicePixelRatio || 1 });
    };
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(post, 250);
    });
    observer.observe(stage);
    const first = window.setTimeout(post, 400);
    return () => {
      observer.disconnect();
      window.clearTimeout(resizeTimer.current);
      window.clearTimeout(first);
    };
  }, [tab.visible]);
  (0, import_react4.useEffect)(() => watchComposer(), [watchComposer]);
  (0, import_react4.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas) return void 0;
    const onWheel = (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scale = scaleRef.current.width / rect.width;
      const unit = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? scaleRef.current.height : 1;
      const dx = event.deltaX * unit * scale;
      const dy = event.deltaY * unit * scale;
      const { x, y } = lastMouseRef.current;
      console.debug("[dsh-browser] wheel fwd", { dy, x, y });
      void postCommand({ type: "input", kind: "wheel", x, y, dx, dy });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [tab.visible]);
  const toPageCoords = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = scaleRef.current.width / rect.width;
    const scaleY = scaleRef.current.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const page = {
      x: Math.min(Math.max(0, x), scaleRef.current.width - 1),
      y: Math.min(Math.max(0, y), scaleRef.current.height - 1)
    };
    lastMouseRef.current = page;
    return page;
  };
  const togglePick = async () => {
    const next = !picking;
    setPicking(next);
    if (next) flashNotice("\u9009\u62E9\u6A21\u5F0F\uFF1A\u70B9\u51FB\u9875\u9762\u5143\u7D20\uFF0C\u4F1A\u4EE5\u300C\u5143\u7D20N\u300D\u5F15\u7528\u63D2\u5165\u8F93\u5165\u6846");
    await postCommand({ type: "pick", enabled: next });
  };
  const onKeyDown = (event) => {
    const forwardedKeys = ["Enter", "Backspace", "Delete", "Escape", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1) {
      event.preventDefault();
      void postCommand({ type: "input", kind: "type", text: event.key });
      return;
    }
    if (forwardedKeys.includes(event.key)) {
      event.preventDefault();
      void postCommand({ type: "input", kind: "key", key: event.key });
    }
  };
  const urlValue = !urlFocused && urlDraft.startsWith("data:") ? status?.title || "data: \u5185\u5D4C\u9875\u9762" : urlDraft;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, fontSize: 12 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: PANEL_STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 3, alignItems: "center", padding: "5px 6px", flexWrap: "nowrap" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "dsh-browser-btn",
          title: "\u540E\u9000",
          onClick: () => void postCommand({ type: "back" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 14 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "dsh-browser-btn",
          title: "\u524D\u8FDB",
          onClick: () => void postCommand({ type: "forward" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "dsh-browser-btn",
          title: "\u5237\u65B0",
          onClick: () => void postCommand({ type: "reload" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          className: "dsh-browser-url",
          value: urlValue,
          placeholder: "\u8F93\u5165\u7F51\u5740\u540E\u56DE\u8F66",
          spellCheck: false,
          onChange: (event) => setUrlDraft(event.target.value),
          onFocus: () => {
            setUrlFocused(true);
            setUrlDraft(status?.url ?? urlDraft);
          },
          onBlur: () => setUrlFocused(false),
          onKeyDown: (event) => {
            if (event.key === "Enter") {
              void postCommand({ type: "navigate", url: urlDraft });
              event.target.blur();
            }
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: "dsh-browser-btn",
          "data-on": picking ? "1" : "0",
          title: "\u9009\u62E9\u5143\u7D20\uFF0C\u4EE5\u300C\u5143\u7D20N\u300D\u5F15\u7528\u63D2\u5165\u8F93\u5165\u6846",
          style: { padding: "0 8px" },
          onClick: () => void togglePick(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MousePointerClick, { size: 14 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: picking ? "\u9009\u62E9\u4E2D" : "\u9009\u62E9\u5143\u7D20" })
          ]
        }
      )
    ] }),
    notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { margin: "0 6px 4px", padding: "4px 8px", borderRadius: 7, background: "color-mix(in srgb, currentColor 8%, transparent)", color: "inherit" }, children: notice }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref: stageRef,
        style: { flex: 1, minHeight: 0, display: "flex", position: "relative", background: "color-mix(in srgb, currentColor 5%, transparent)" },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "canvas",
          {
            ref: canvasRef,
            tabIndex: 0,
            onKeyDown,
            onMouseMove: (event) => {
              const { x, y } = toPageCoords(event);
              void postCommand({ type: "input", kind: "move", x, y });
            },
            onClick: (event) => {
              const { x, y } = toPageCoords(event);
              void postCommand({ type: "input", kind: "click", x, y });
            },
            onDoubleClick: (event) => {
              const { x, y } = toPageCoords(event);
              void postCommand({ type: "input", kind: "dblclick", x, y });
            },
            style: {
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "contain",
              outline: picking ? "2px solid #3b82f6" : "none",
              outlineOffset: picking ? "-2px" : void 0,
              cursor: picking ? "crosshair" : "default"
            }
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, padding: "3px 6px", opacity: 0.75, alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          style: {
            width: 7,
            height: 7,
            borderRadius: 999,
            flexShrink: 0,
            background: connected ? "#22c55e" : "color-mix(in srgb, currentColor 35%, transparent)"
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: status?.url ? `${status.title || status.url}` : connected ? "\u6D4F\u89C8\u5668\u5F85\u542F\u52A8\uFF1A\u8F93\u5165\u7F51\u5740\u6216\u8BA9\u6A21\u578B\u8C03\u7528 browser_navigate" : "\u672A\u8FDE\u63A5\uFF08\u9762\u677F\u53EF\u89C1\u65F6\u81EA\u52A8\u8FDE\u63A5\uFF09" })
    ] })
  ] });
}

// src/client/tool-card.tsx
var import_react5 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function ScreenshotToolView(props) {
  const { block, loadImage } = props;
  if (block.kind !== "tool-result") {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 12, opacity: 0.7, padding: "2px 0" }, children: "\u6B63\u5728\u622A\u56FE\u2026" });
  }
  if (block.isError) return null;
  const imageBlock = block.content.find((part) => part.type === "image");
  if (!imageBlock) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ScreenshotImage, { attachment: imageBlock.attachment, loadImage });
}
function ScreenshotImage(props) {
  const [url, setUrl] = (0, import_react5.useState)(props.loadImage.peek?.(props.attachment));
  (0, import_react5.useEffect)(() => {
    let alive = true;
    props.loadImage(props.attachment).then((next) => {
      if (alive) setUrl(next);
    }).catch(() => void 0);
    return () => {
      alive = false;
    };
  }, [props.attachment, props.loadImage]);
  if (!url) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 12, opacity: 0.7 }, children: "\u622A\u56FE\u52A0\u8F7D\u4E2D\u2026" });
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "img",
    {
      src: url,
      alt: `browser screenshot ${props.attachment.width}\xD7${props.attachment.height}`,
      style: { maxWidth: "100%", borderRadius: 6, border: "1px solid var(--dsh-border, #d4d4d8)", display: "block" }
    }
  );
}

// src/client/element-refs.ts
var ELEMENT_SOURCE = "browser-element";
var STORE_KEY = "dsh-plugin-browser:elements";
var elements = /* @__PURE__ */ new Map();
var lexiconListeners = /* @__PURE__ */ new Set();
var seq = 0;
function labelOf(ref) {
  const n = Number(ref.slice("element-".length));
  return Number.isFinite(n) ? `\u5143\u7D20${n}` : ref;
}
function persist() {
  try {
    const rows = [...elements.entries()].map(([ref, entry]) => ({ ref, ...entry }));
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ seq, rows }));
  } catch {
  }
}
function restore() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    seq = saved.seq ?? 0;
    for (const row of saved.rows) elements.set(row.ref, { label: row.label, pick: row.pick });
  } catch {
  }
}
restore();
function rememberElement(pick) {
  seq += 1;
  const ref = `element-${seq}`;
  elements.set(ref, { label: `\u5143\u7D20${seq}`, pick });
  persist();
  for (const listener of lexiconListeners) {
    try {
      listener();
    } catch {
    }
  }
  return { ref, label: `\u5143\u7D20${seq}` };
}
function elementModelText(ref) {
  const entry = elements.get(ref);
  if (!entry) {
    throw new Error(`unknown browser element reference "${ref}" \u2014 the panel session that picked it is gone`);
  }
  const p = entry.pick;
  const lines = [
    `${entry.label}\uFF08\u5728 dsh \u6D4F\u89C8\u5668\u9762\u677F\u4E2D\u9009\u4E2D\u7684\u9875\u9762\u5143\u7D20\uFF0C\u9875\u9762: ${p.url}${p.title ? ` \u2014 ${p.title}` : ""}\uFF09\uFF1A`,
    `- \u9009\u62E9\u5668: ${p.selector}`,
    `- \u6807\u7B7E: <${p.tag}${p.id ? ` id="${p.id}"` : ""}${p.classes ? ` class="${p.classes}"` : ""}${p.role ? ` role="${p.role}"` : ""}>`,
    p.ariaLabel ? `- aria-label: ${p.ariaLabel}` : "",
    p.href ? `- href: ${p.href}` : "",
    p.type ? `- type: ${p.type}` : "",
    p.placeholder ? `- placeholder: ${p.placeholder}` : "",
    p.text ? `- \u6587\u672C: ${JSON.stringify(p.text)}` : "",
    `- outerHTML: ${p.outerHTML}`
  ];
  return lines.filter(Boolean).join("\n");
}
function resetElements() {
  elements.clear();
  seq = 0;
  persist();
  for (const listener of lexiconListeners) {
    try {
      listener();
    } catch {
    }
  }
}
function watchComposerClear(ctx, sessionId) {
  const binding = ctx.sessions.binding(sessionId);
  if (!binding) return () => void 0;
  const input = ctx.conversation.input.for(binding.ctx);
  let prevHadContent = false;
  return input.state.subscribe(() => {
    const state = input.state.getSnapshot();
    const hadContent = prevHadContent;
    prevHadContent = state.draft !== "";
    if (hadContent && state.draft === "" && state.phase === "plain") resetElements();
  });
}
function browserElementSource() {
  return {
    trigger: "@",
    name: ELEMENT_SOURCE,
    order: 90,
    candidates: async (_session, req) => {
      const rows = [...elements.entries()].reverse();
      return rows.map(([ref, entry]) => ({
        name: entry.label,
        description: `<${entry.pick.tag}> ${entry.pick.text.slice(0, 60)}${entry.pick.text.length > 60 ? "\u2026" : ""}`,
        value: ref
      })).filter((candidate) => candidate.name.includes(req.query));
    },
    onPick: (pick) => {
      const ref = pick.candidate.value;
      const entry = ref ? elements.get(ref) : void 0;
      if (pick.action !== "pick" || !ref || !entry) return void 0;
      return {
        insert: {
          source: ELEMENT_SOURCE,
          ref,
          label: entry.label,
          clipboardText: entry.label,
          appearance: "session"
        }
      };
    },
    lexicon: () => [...elements.values()].map((entry) => entry.label),
    subscribeLexicon: (_session, listener) => {
      lexiconListeners.add(listener);
      return () => lexiconListeners.delete(listener);
    },
    codec: {
      clipboardText: (ref) => labelOf(ref),
      serialize: async (ref) => elementModelText(ref)
    }
  };
}
function insertElementRef(ctx, sessionId, pick) {
  const binding = ctx.sessions.binding(sessionId);
  if (!binding) throw new Error("session binding unavailable");
  const input = ctx.conversation.input.for(binding.ctx);
  const state = input.state.getSnapshot();
  if (seq > 0 && state.draft === "" && state.phase === "plain") resetElements();
  const { ref, label } = rememberElement(pick);
  const chipExtra = state.occurrences.reduce(
    (sum, occ) => sum + (occ.length - 1),
    0
  );
  const at = Math.max(0, state.draft.length - chipExtra);
  const applied = input.insertReference(
    {
      source: ELEMENT_SOURCE,
      ref,
      label,
      clipboardText: label,
      appearance: "session"
    },
    { start: at, end: at, draftRev: state.draftRev }
  );
  if (!applied) throw new Error("composer refused the reference insert");
  return label;
}

// src/client/index.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var TAB_ID = "dsh-plugin-browser";
var TAB_KIND = "browser";
var inject = ["slots", "sidebarRightTabs", "sidebarRight", "conversation", "sessions", "inputTriggers"];
var FOOTER_STYLES = `
.dsh-browser-footrow {
  flex: none; align-items: center; gap: 8px;
  width: calc(100% + 4px); margin: 4px -2px; display: flex;
}
.dsh-browser-footrow.dsh-browser-railrow { width: 36px; margin: 8px 0 10px; }
.dsh-browser-footbtn {
  box-sizing: border-box; cursor: pointer; width: auto; min-width: 0;
  height: 42px; color: var(--dsw-alias-label-primary, inherit);
  background: 0 0; border: none; border-radius: 12px;
  flex: 1; align-items: center; gap: 8px; margin: 0;
  padding: 0 10px 0 8px; font-family: inherit; font-size: 14px; line-height: 22px;
  display: flex; overflow: hidden; text-align: left;
}
.dsh-browser-footbtn:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 8%, transparent));
}
.dsh-browser-footbtn:focus-visible {
  outline: 2px solid var(--dsw-alias-border-focus, color-mix(in srgb, currentColor 35%, transparent));
  outline-offset: -2px;
}
.dsh-browser-footbtn.dsh-browser-rail {
  border-radius: 50%; flex: none; justify-content: center; gap: 0;
  width: 36px; height: 36px; margin: 0; padding: 0;
}
.dsh-browser-footlabel { white-space: nowrap; overflow: hidden; }
`;
function FooterButton(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: props.wide ? "dsh-browser-footrow" : "dsh-browser-footrow dsh-browser-railrow", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: FOOTER_STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "button",
      {
        type: "button",
        className: props.wide ? "dsh-browser-footbtn" : "dsh-browser-footbtn dsh-browser-rail",
        onClick: () => props.open(),
        title: "\u6D4F\u89C8\u5668\uFF1A\u6253\u5F00\u5185\u7F6E\u6D4F\u89C8\u5668\u9762\u677F",
        "aria-label": "\u6D4F\u89C8\u5668",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives2.IconGlobeOutlineRegular, { size: props.wide ? 16 : 18 }),
          props.wide ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsh-browser-footlabel", children: "\u6D4F\u89C8\u5668" }) : null
        ]
      }
    )
  ] });
}
function apply(ctx) {
  ctx.effect(() => ctx.inputTriggers.registerSource(browserElementSource()), "dsh-plugin-browser: element trigger source");
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: "extension",
    title: () => "\u6D4F\u89C8\u5668",
    guide: [{
      id: "browser",
      order: 10,
      title: () => "\u6D4F\u89C8\u5668",
      description: () => "\u6253\u5F00\u5185\u7F6E\u6D4F\u89C8\u5668\uFF0C\u9009\u62E9\u9875\u9762\u5143\u7D20\u9644\u52A0\u5230\u8F93\u5165\u6846"
    }]
  }), "dsh-plugin-browser: tab type");
  ctx.effect(() => ctx.slots.inject(
    "sidebar.right.pane.tab",
    () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: TAB_ID,
      inject: (sessionId) => ({
        insertElement: (pick) => insertElementRef(ctx, sessionId, pick),
        watchComposer: () => watchComposerClear(ctx, sessionId)
      })
    }, BrowserPanel)
  ), "dsh-plugin-browser: tab body");
  ctx.effect(() => ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register({
      name: "sidebar.footer.action",
      id: "dsh-plugin-browser-open",
      order: 10,
      inject: () => ({
        open: () => ctx.sidebarRight.openTab(TAB_KIND)
      })
    }, FooterButton)
  ), "dsh-plugin-browser: footer action");
  ctx.effect(() => ctx.slots.inject(
    "tool.call.toolview",
    () => ctx.slots.register({
      name: "tool.call.toolview",
      key: "browser_screenshot"
    }, ScreenshotToolView)
  ), "dsh-plugin-browser: screenshot tool card");
}
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs:
lucide-react/dist/esm/shared/src/utils/toLucideIconData.mjs:
lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs:
lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs:
lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs:
lucide-react/dist/esm/shared/src/build/defaultAttributes.mjs:
lucide-react/dist/esm/shared/src/build/buildLucideIconNode.mjs:
lucide-react/dist/esm/shared/src/build/buildLucideIconForReact.mjs:
lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs:
lucide-react/dist/esm/context.mjs:
lucide-react/dist/esm/Icon.mjs:
lucide-react/dist/esm/createLucideIcon.mjs:
lucide-react/dist/esm/icons/mouse-pointer-click.mjs:
lucide-react/dist/esm/lucide-react.mjs:
  (**
   * @license lucide-react v1.70.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/

		return module.exports;
	}
});
//# sourceMappingURL=client.js.map
