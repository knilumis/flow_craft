(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const GRID_SIZE = 10;
  const MIN_NODE_W = 40;
  const MIN_NODE_H = 30;
  const HISTORY_LIMIT = 50;
  const RESIZE_HANDLE_OUTSET = 12;
  const QUICK_ARROW_DISTANCE = 24;
  const QUICK_ADD_OFFSET = 90;
  const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;
  const AUTO_SAVE_STORAGE_KEY = "flowchart-autosave-v1";
  const GROUP_COLLAPSED_MIN_W = 72;
  const GROUP_COLLAPSED_MIN_H = 30;
  const GROUP_PADDING = 20;
  const ANCHORS = ["top", "right", "bottom", "left"];
  const SUPPORTED_NODE_TYPES = [
    "dikdortgen",
    "yuvarlatilmis",
    "oval",
    "elmas",
    "paralelkenar",
    "silindir",
    "belge",
    "altSurec",
    "not"
  ];

  const THEME_PRESETS = [
    {
      name: "Kuzey",
      fills: ["#E0F2FE", "#DCFCE7", "#FEF3C7", "#FEE2E2", "#EDE9FE"],
      stroke: "#1E293B",
      text: "#0F172A",
      edge: "#334155"
    },
    {
      name: "Gün Batımı",
      fills: ["#FFF7ED", "#FFE4E6", "#F5F3FF", "#ECFEFF", "#FEF9C3"],
      stroke: "#7C2D12",
      text: "#431407",
      edge: "#9A3412"
    },
    {
      name: "Orman",
      fills: ["#DCFCE7", "#CCFBF1", "#ECFCCB", "#F0FDF4", "#D9F99D"],
      stroke: "#14532D",
      text: "#052E16",
      edge: "#166534"
    }
  ];

  const refs = {
    canvas: document.getElementById("canvas"),
    workspace: document.querySelector(".workspace"),
    viewport: document.getElementById("viewport"),
    gridRect: document.getElementById("gridRect"),
    pageLayer: document.getElementById("pageLayer"),
    edgeLayer: document.getElementById("edgeLayer"),
    groupLayer: document.getElementById("groupLayer"),
    nodeLayer: document.getElementById("nodeLayer"),
    overlayLayer: document.getElementById("overlayLayer"),
    quickPalette: document.getElementById("quickPalette"),
    toastContainer: document.getElementById("toastContainer"),

    btnYeni: document.getElementById("btnYeni"),
    btnAc: document.getElementById("btnAc"),
    btnKaydet: document.getElementById("btnKaydet"),
    btnPdf: document.getElementById("btnPdf"),
    pdfYon: document.getElementById("pdfYon"),
    xmlDosyaInput: document.getElementById("xmlDosyaInput"),

    btnGeriAl: document.getElementById("btnGeriAl"),
    btnYinele: document.getElementById("btnYinele"),
    btnKopyala: document.getElementById("btnKopyala"),
    btnYapistir: document.getElementById("btnYapistir"),
    btnSil: document.getElementById("btnSil"),
    btnGrupla: document.getElementById("btnGrupla"),

    btnIzgara: document.getElementById("btnIzgara"),
    btnSnap: document.getElementById("btnSnap"),
    btnZoomIn: document.getElementById("btnZoomIn"),
    btnZoomOut: document.getElementById("btnZoomOut"),
    btnZoomReset: document.getElementById("btnZoomReset"),
    btnTema: document.getElementById("btnTema"),

    btnOneGetir: document.getElementById("btnOneGetir"),
    btnArkayaGonder: document.getElementById("btnArkayaGonder"),
    zoomSeviye: document.getElementById("zoomSeviye"),
    btnEklentiTema: document.getElementById("btnEklentiTema"),
    btnEklentiAkis: document.getElementById("btnEklentiAkis"),
    btnEklentiNot: document.getElementById("btnEklentiNot"),

    secimBilgi: document.getElementById("secimBilgi"),
    blokOzellikleri: document.getElementById("blokOzellikleri"),
    baglantiOzellikleri: document.getElementById("baglantiOzellikleri"),

    propMetin: document.getElementById("propMetin"),
    propFontFamily: document.getElementById("propFontFamily"),
    propFontSize: document.getElementById("propFontSize"),
    propTextColor: document.getElementById("propTextColor"),
    propTextAlign: document.getElementById("propTextAlign"),
    propBold: document.getElementById("propBold"),
    propItalic: document.getElementById("propItalic"),
    propFill: document.getElementById("propFill"),
    propStroke: document.getElementById("propStroke"),
    propStrokeWidth: document.getElementById("propStrokeWidth"),
    propRadius: document.getElementById("propRadius"),
    propW: document.getElementById("propW"),
    propH: document.getElementById("propH"),

    propEdgeStroke: document.getElementById("propEdgeStroke"),
    propEdgeStrokeWidth: document.getElementById("propEdgeStrokeWidth"),
    propEdgeDashed: document.getElementById("propEdgeDashed"),
    propEdgeArrow: document.getElementById("propEdgeArrow"),
    propEdgeType: document.getElementById("propEdgeType"),
    propEdgeCornerRadius: document.getElementById("propEdgeCornerRadius"),
    propEdgeLabel: document.getElementById("propEdgeLabel"),
    propEdgeLabelSize: document.getElementById("propEdgeLabelSize"),
    propEdgeLabelColor: document.getElementById("propEdgeLabelColor")
  };

  if (!refs.canvas) {
    return;
  }

  const defaultTextStyle = {
    fontFamily: "Arial",
    fontSize: 10,
    color: "#111111",
    bold: false,
    italic: false,
    align: "center"
  };

  const defaultShapeStyle = {
    fill: "#ffffff",
    stroke: "#1f2937",
    strokeWidth: 2,
    radius: 10
  };

  const defaultEdgeStyle = {
    stroke: "#334155",
    strokeWidth: 2,
    dashed: false,
    arrow: true
  };

  const defaultEdgeRoute = {
    type: "orthogonal",
    cornerRadius: 0,
    bend: null,
    controlX: null,
    controlY: null
  };

  const defaultEdgeLabel = {
    text: "",
    fontSize: 10,
    color: "#111111",
    offsetX: 0,
    offsetY: 0
  };

  let idCounter = 1;

  // Uygulamanın tekil durumu: model, seçim, görünüm ve etkileşim bilgileri.
  const state = {
    doc: createSampleDocument(),
    selectedNodeIds: new Set(),
    selectedEdgeId: null,
    selectedGroupId: null,
    ui: {
      showGrid: true,
      snapToGrid: true,
      scale: 1,
      panX: 0,
      panY: 0,
      pdfOrientation: "landscape",
      theme: getInitialTheme(),
      quickAdd: {
        open: false,
        nodeId: null,
        direction: null
      },
      themeIndex: 0
    },
    clipboard: null,
    pasteOffset: 0,
    keyboard: {
      spacePressed: false
    },
    history: {
      undo: [],
      redo: [],
      pendingSnapshot: null
    },
    autoSave: {
      timerId: null,
      dirty: false,
      lastSavedAt: null
    },
    interaction: {
      mode: null,
      pointerId: null,
      moved: false,
      startWorld: null,
      currentWorld: null,
      startClient: null,
      startPan: null,
      dragItems: [],
      groupDrag: null,
      resizeItem: null,
      edgeHandle: null,
      edgeEndpoint: null,
      edgeLabel: null,
      connectFrom: null,
      marqueeAdditive: false
    },
    rafPending: false,
    panelSync: false
  };

  const mathCache = new Map();
  let mathJaxReady = Boolean(window.MathJax?.tex2svg);

  function cloneDeep(value) {
    if (window.structuredClone) {
      return window.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function createSvgElement(tagName, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tagName);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        el.setAttribute(key, String(value));
      }
    });
    return el;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sanitizeColor(value, fallback) {
    if (typeof value !== "string") {
      return fallback;
    }
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return trimmed;
    }
    return fallback;
  }

  function normalizeAnchor(anchor) {
    return ANCHORS.includes(anchor) ? anchor : "right";
  }

  function parseBooleanAttr(value, defaultValue) {
    if (value == null) {
      return defaultValue;
    }
    return value === "1" || value.toLowerCase() === "true";
  }

  function parseNumberAttr(value, defaultValue) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  function parseNullableNumberAttr(value) {
    if (value == null || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeTheme(value) {
    return value === "dark" ? "dark" : "light";
  }

  function getInitialTheme() {
    const bodyTheme = normalizeTheme(document.body?.dataset?.theme || "light");
    try {
      const storedTheme = window.localStorage.getItem("flowchart-theme");
      if (storedTheme) {
        return normalizeTheme(storedTheme);
      }
    } catch (error) {
      // localStorage engeli tema uygulamasını durdurmamalı.
    }
    return bodyTheme;
  }

  function normalizeEdgeType(value) {
    return ["orthogonal", "straight", "curved"].includes(value) ? value : "orthogonal";
  }

  function normalizeEdgeRoute(route) {
    const bendRaw = Number(route?.bend);
    const controlXRaw = Number(route?.controlX);
    const controlYRaw = Number(route?.controlY);
    return {
      type: normalizeEdgeType(route?.type),
      cornerRadius: clamp(Number(route?.cornerRadius) || 0, 0, 60),
      bend: Number.isFinite(bendRaw) ? snapAlways(bendRaw) : null,
      controlX: Number.isFinite(controlXRaw) ? snapAlways(controlXRaw) : null,
      controlY: Number.isFinite(controlYRaw) ? snapAlways(controlYRaw) : null
    };
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function generateId(prefix) {
    idCounter += 1;
    return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
  }

  function getTypeLabel(type) {
    const labels = {
      dikdortgen: "Dikdörtgen",
      yuvarlatilmis: "Yuvarlatılmış",
      oval: "Oval",
      elmas: "Elmas",
      paralelkenar: "Paralelkenar",
      silindir: "Silindir",
      belge: "Belge",
      altSurec: "Alt Süreç",
      not: "Not"
    };
    return labels[type] || type;
  }

  function getTypeSymbol(type) {
    const symbols = {
      dikdortgen: "[ ]",
      yuvarlatilmis: "( )",
      oval: "(O)",
      elmas: "<>",
      paralelkenar: "[/]",
      silindir: "(DB)",
      belge: "[DOC]",
      altSurec: "[||]",
      not: "[!]"
    };
    return symbols[type] || "[ ]";
  }

  function isSupportedNodeType(type) {
    return SUPPORTED_NODE_TYPES.includes(type);
  }

  function snap(value) {
    if (!state.ui.snapToGrid) {
      return value;
    }
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  function snapAlways(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  function getPdfPageSize() {
    if (state.ui.pdfOrientation === "portrait") {
      return { width: 595, height: 842 };
    }
    return { width: 842, height: 595 };
  }

  function getDirectionAnchors(direction) {
    if (direction === "left") {
      return { from: "left", to: "right" };
    }
    if (direction === "top") {
      return { from: "top", to: "bottom" };
    }
    if (direction === "bottom") {
      return { from: "bottom", to: "top" };
    }
    return { from: "right", to: "left" };
  }

  function parseLatexExpression(rawText) {
    const source = String(rawText || "").trim();
    if (!source) {
      return null;
    }

    if (source.startsWith("tex:")) {
      const expr = source.slice(4).trim();
      return expr ? { expr, display: false } : null;
    }
    if (source.startsWith("$$") && source.endsWith("$$") && source.length > 4) {
      return { expr: source.slice(2, -2).trim(), display: true };
    }
    if (source.startsWith("\\[") && source.endsWith("\\]") && source.length > 4) {
      return { expr: source.slice(2, -2).trim(), display: true };
    }
    if (source.startsWith("$") && source.endsWith("$") && source.length > 2) {
      return { expr: source.slice(1, -1).trim(), display: false };
    }
    if (source.startsWith("\\(") && source.endsWith("\\)") && source.length > 4) {
      return { expr: source.slice(2, -2).trim(), display: false };
    }
    return null;
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    refs.toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 200ms";
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
  }

  function closeQuickPalette() {
    state.ui.quickAdd.open = false;
    state.ui.quickAdd.nodeId = null;
    state.ui.quickAdd.direction = null;
    if (!refs.quickPalette) {
      return;
    }
    refs.quickPalette.hidden = true;
    refs.quickPalette.innerHTML = "";
  }

  function openQuickPalette(nodeId, direction, clientX, clientY) {
    if (!refs.quickPalette || !refs.workspace) {
      return;
    }

    const sourceNode = getNodeById(nodeId);
    if (!sourceNode) {
      return;
    }

    state.ui.quickAdd.open = true;
    state.ui.quickAdd.nodeId = nodeId;
    state.ui.quickAdd.direction = direction;

    const buttons = SUPPORTED_NODE_TYPES.map(
      (type) =>
        `<button type="button" class="quick-palette-btn" data-quick-type="${type}" title="${getTypeLabel(type)}">${getTypeSymbol(
          type
        )}</button>`
    ).join("");
    refs.quickPalette.innerHTML = `<div class="quick-palette-grid">${buttons}</div>`;
    refs.quickPalette.hidden = false;

    const workspaceRect = refs.workspace.getBoundingClientRect();
    const paletteRect = refs.quickPalette.getBoundingClientRect();
    const targetLeft = clientX - workspaceRect.left + 12;
    const targetTop = clientY - workspaceRect.top + 12;
    const left = clamp(targetLeft, 8, Math.max(8, workspaceRect.width - paletteRect.width - 8));
    const top = clamp(targetTop, 8, Math.max(8, workspaceRect.height - paletteRect.height - 8));

    refs.quickPalette.style.left = `${left}px`;
    refs.quickPalette.style.top = `${top}px`;
  }

  function createEmptyDocument() {
    return {
      nodes: [],
      edges: [],
      groups: [],
      meta: {
        version: "1.0",
        createdAt: new Date().toISOString(),
        app: "FlowChartTR"
      }
    };
  }

  function createNode(type, x, y, id = generateId("n")) {
    const size = {
      dikdortgen: { w: 96, h: 44 },
      yuvarlatilmis: { w: 96, h: 44 },
      oval: { w: 96, h: 44 },
      elmas: { w: 102, h: 60 },
      paralelkenar: { w: 104, h: 48 },
      silindir: { w: 104, h: 62 },
      belge: { w: 104, h: 54 },
      altSurec: { w: 110, h: 50 },
      not: { w: 96, h: 50 }
    }[type] || { w: 96, h: 44 };

    const label = {
      elmas: "Karar",
      paralelkenar: "Veri",
      silindir: "Veritabanı",
      belge: "Belge",
      altSurec: "Alt Süreç",
      not: "Not"
    }[type] || "Yeni Blok";

    const shapeStyle = cloneDeep(defaultShapeStyle);
    if (type === "yuvarlatilmis") {
      shapeStyle.radius = 24;
    }
    if (type === "not") {
      shapeStyle.fill = "#FFF7CC";
      shapeStyle.stroke = "#A16207";
    }

    return {
      id,
      type,
      x,
      y,
      w: size.w,
      h: size.h,
      text: label,
      textStyle: cloneDeep(defaultTextStyle),
      shapeStyle,
      zIndex: 1
    };
  }

  function createEdge(fromNodeId, fromAnchor, toNodeId, toAnchor, id = generateId("e")) {
    return {
      id,
      from: { nodeId: fromNodeId || null, anchor: normalizeAnchor(fromAnchor), point: null },
      to: { nodeId: toNodeId || null, anchor: normalizeAnchor(toAnchor), point: null },
      style: cloneDeep(defaultEdgeStyle),
      route: cloneDeep(defaultEdgeRoute),
      label: cloneDeep(defaultEdgeLabel)
    };
  }

  function createGroup(nodeIds, id = generateId("g")) {
    return {
      id,
      nodeIds: [...nodeIds],
      collapsed: false,
      frame: null,
      text: "Grup",
      type: "yuvarlatilmis",
      textStyle: cloneDeep(defaultTextStyle),
      shapeStyle: {
        fill: "#ffffff",
        stroke: "#0f766e",
        strokeWidth: 2,
        radius: 12
      }
    };
  }

  function createSampleDocument() {
    const doc = createEmptyDocument();

    const n1 = createNode("dikdortgen", 80, 120, "n1");
    n1.text = "Başla";
    n1.shapeStyle.fill = "#dcfce7";

    const n2 = createNode("dikdortgen", 340, 120, "n2");
    n2.text = "İşlem";
    n2.shapeStyle.fill = "#e0f2fe";

    const n3 = createNode("elmas", 620, 100, "n3");
    n3.text = "Karar";
    n3.shapeStyle.fill = "#fef3c7";

    const n4 = createNode("oval", 900, 120, "n4");
    n4.text = "Bitti";
    n4.shapeStyle.fill = "#fee2e2";

    n1.zIndex = 1;
    n2.zIndex = 2;
    n3.zIndex = 3;
    n4.zIndex = 4;

    const e1 = createEdge("n1", "right", "n2", "left", "e1");
    const e2 = createEdge("n2", "right", "n3", "left", "e2");
    const e3 = createEdge("n3", "right", "n4", "left", "e3");
    e3.label.text = "Evet";
    const e4 = createEdge("n3", "top", "n2", "bottom", "e4");
    e4.label.text = "Hayır";

    doc.nodes.push(n1, n2, n3, n4);
    doc.edges.push(e1, e2, e3, e4);
    return doc;
  }

  // ===== Model =====
  function getNodeById(nodeId) {
    return state.doc.nodes.find((node) => node.id === nodeId) || null;
  }

  function getEdgeById(edgeId) {
    return state.doc.edges.find((edge) => edge.id === edgeId) || null;
  }

  function getGroupById(groupId) {
    return (state.doc.groups || []).find((group) => group.id === groupId) || null;
  }

  function getGroupForNode(nodeId) {
    return (state.doc.groups || []).find((group) => Array.isArray(group.nodeIds) && group.nodeIds.includes(nodeId)) || null;
  }

  function getCollapsedGroupForNode(nodeId) {
    const group = getGroupForNode(nodeId);
    return group && group.collapsed ? group : null;
  }

  function getRectAnchorPoint(rect, anchor) {
    switch (anchor) {
      case "top":
        return { x: rect.x + rect.w / 2, y: rect.y };
      case "right":
        return { x: rect.x + rect.w, y: rect.y + rect.h / 2 };
      case "bottom":
        return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
      case "left":
      default:
        return { x: rect.x, y: rect.y + rect.h / 2 };
    }
  }

  function computeNodesBounds(nodeIds) {
    const nodes = nodeIds.map((id) => getNodeById(id)).filter(Boolean);
    if (!nodes.length) {
      return null;
    }
    return {
      minX: Math.min(...nodes.map((node) => node.x)),
      minY: Math.min(...nodes.map((node) => node.y)),
      maxX: Math.max(...nodes.map((node) => node.x + node.w)),
      maxY: Math.max(...nodes.map((node) => node.y + node.h))
    };
  }

  function ensureGroupDefaults(group) {
    if (!group || typeof group !== "object") {
      return null;
    }

    group.id = group.id || generateId("g");
    if (!Array.isArray(group.nodeIds)) {
      group.nodeIds = [];
    }
    group.collapsed = Boolean(group.collapsed);
    if (typeof group.text !== "string") {
      group.text = "Grup";
    }
    group.type = isSupportedNodeType(group.type) ? group.type : "yuvarlatilmis";
    if (!group.textStyle || typeof group.textStyle !== "object") {
      group.textStyle = cloneDeep(defaultTextStyle);
    } else {
      group.textStyle.fontFamily = group.textStyle.fontFamily || defaultTextStyle.fontFamily;
      group.textStyle.fontSize = clamp(Number(group.textStyle.fontSize) || defaultTextStyle.fontSize, 8, 72);
      group.textStyle.color = sanitizeColor(group.textStyle.color, defaultTextStyle.color);
      group.textStyle.bold = Boolean(group.textStyle.bold);
      group.textStyle.italic = Boolean(group.textStyle.italic);
      group.textStyle.align = ["left", "center", "right"].includes(group.textStyle.align)
        ? group.textStyle.align
        : defaultTextStyle.align;
    }
    if (!group.shapeStyle || typeof group.shapeStyle !== "object") {
      group.shapeStyle = {
        fill: "#ffffff",
        stroke: "#0f766e",
        strokeWidth: 2,
        radius: 12
      };
    } else {
      group.shapeStyle.fill = sanitizeColor(group.shapeStyle.fill, "#ffffff");
      group.shapeStyle.stroke = sanitizeColor(group.shapeStyle.stroke, "#0f766e");
      group.shapeStyle.strokeWidth = clamp(Number(group.shapeStyle.strokeWidth) || 2, 1, 20);
      group.shapeStyle.radius = clamp(Number(group.shapeStyle.radius) || 12, 0, 80);
    }
    const frame = group.frame;
    if (frame && Number.isFinite(frame.x) && Number.isFinite(frame.y) && Number.isFinite(frame.w) && Number.isFinite(frame.h)) {
      group.frame = {
        x: snapAlways(frame.x),
        y: snapAlways(frame.y),
        w: Math.max(GROUP_COLLAPSED_MIN_W, snapAlways(frame.w)),
        h: Math.max(GROUP_COLLAPSED_MIN_H, snapAlways(frame.h))
      };
    } else {
      group.frame = null;
    }
    return group;
  }

  function getGroupExpandedFrame(group) {
    const bounds = computeNodesBounds(group.nodeIds || []);
    if (!bounds) {
      return null;
    }
    return {
      x: snapAlways(bounds.minX - GROUP_PADDING),
      y: snapAlways(bounds.minY - GROUP_PADDING),
      w: Math.max(GROUP_COLLAPSED_MIN_W, snapAlways(bounds.maxX - bounds.minX + GROUP_PADDING * 2)),
      h: Math.max(GROUP_COLLAPSED_MIN_H, snapAlways(bounds.maxY - bounds.minY + GROUP_PADDING * 2))
    };
  }

  function estimateCollapsedGroupSize(group) {
    const title = String(group.text || "").trim() || "Grup";
    const estimatedWidth = clamp(title.length * 6 + 36, GROUP_COLLAPSED_MIN_W, 260);
    return {
      w: Math.max(GROUP_COLLAPSED_MIN_W, snapAlways(estimatedWidth)),
      h: Math.max(GROUP_COLLAPSED_MIN_H, snapAlways(34))
    };
  }

  function computeCollapsedGroupFrame(group) {
    ensureGroupDefaults(group);
    if (group.frame && Number.isFinite(group.frame.x) && Number.isFinite(group.frame.y) && Number.isFinite(group.frame.w) && Number.isFinite(group.frame.h)) {
      return {
        x: group.frame.x,
        y: group.frame.y,
        w: group.frame.w,
        h: group.frame.h
      };
    }
    const expanded = getGroupExpandedFrame(group);
    const collapsedSize = estimateCollapsedGroupSize(group);
    if (!expanded) {
      return {
        x: 0,
        y: 0,
        w: collapsedSize.w,
        h: collapsedSize.h
      };
    }
    return {
      x: expanded.x,
      y: expanded.y,
      w: collapsedSize.w,
      h: collapsedSize.h
    };
  }

  function isNodeVisible(nodeId) {
    return !getCollapsedGroupForNode(nodeId);
  }

  function getMaxZIndex() {
    if (!state.doc.nodes.length) {
      return 0;
    }
    return Math.max(...state.doc.nodes.map((node) => node.zIndex || 0));
  }

  function normalizeZIndices() {
    state.doc.nodes
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .forEach((node, index) => {
        node.zIndex = index + 1;
      });
  }

  function ensureValidSelection() {
    const nodeIdSet = new Set(state.doc.nodes.map((node) => node.id));
    const nextSelection = new Set();
    state.selectedNodeIds.forEach((nodeId) => {
      if (nodeIdSet.has(nodeId) && isNodeVisible(nodeId)) {
        nextSelection.add(nodeId);
      }
    });
    state.selectedNodeIds = nextSelection;

    if (state.selectedEdgeId && !getEdgeById(state.selectedEdgeId)) {
      state.selectedEdgeId = null;
    }
    if (state.selectedGroupId && !getGroupById(state.selectedGroupId)) {
      state.selectedGroupId = null;
    }
  }

  function clearSelection() {
    state.selectedNodeIds.clear();
    state.selectedEdgeId = null;
    state.selectedGroupId = null;
    closeQuickPalette();
  }

  function selectSingleNode(nodeId) {
    state.selectedNodeIds = new Set([nodeId]);
    state.selectedEdgeId = null;
    state.selectedGroupId = null;
  }

  function toggleNodeSelection(nodeId) {
    state.selectedEdgeId = null;
    state.selectedGroupId = null;
    if (state.selectedNodeIds.has(nodeId)) {
      state.selectedNodeIds.delete(nodeId);
    } else {
      state.selectedNodeIds.add(nodeId);
    }
    if (state.selectedNodeIds.size !== 1) {
      closeQuickPalette();
    }
  }

  function selectSingleEdge(edgeId) {
    state.selectedNodeIds.clear();
    state.selectedEdgeId = edgeId;
    state.selectedGroupId = null;
    closeQuickPalette();
  }

  // ===== History =====
  // Geçmiş yönetimi (Undo/Redo): işlem öncesi snapshot alıp fark varsa saklar.
  const History = {
    begin() {
      if (!state.history.pendingSnapshot) {
        state.history.pendingSnapshot = cloneDeep(state.doc);
      }
    },

    commit() {
      if (!state.history.pendingSnapshot) {
        return;
      }
      const before = JSON.stringify(state.history.pendingSnapshot);
      const after = JSON.stringify(state.doc);
      const changed = before !== after;
      if (changed) {
        state.history.undo.push(state.history.pendingSnapshot);
        if (state.history.undo.length > HISTORY_LIMIT) {
          state.history.undo.shift();
        }
        state.history.redo = [];
        state.autoSave.dirty = true;
      }
      state.history.pendingSnapshot = null;
      UI.updateToolbarState();
    },

    cancel() {
      state.history.pendingSnapshot = null;
    },

    undo() {
      if (!state.history.undo.length) {
        return;
      }
      state.history.redo.push(cloneDeep(state.doc));
      state.doc = state.history.undo.pop();
      state.history.pendingSnapshot = null;
      ensureValidSelection();
      Renderer.render();
      UI.updatePropertiesPanel();
      UI.updateToolbarState();
    },

    redo() {
      if (!state.history.redo.length) {
        return;
      }
      state.history.undo.push(cloneDeep(state.doc));
      if (state.history.undo.length > HISTORY_LIMIT) {
        state.history.undo.shift();
      }
      state.doc = state.history.redo.pop();
      state.history.pendingSnapshot = null;
      ensureValidSelection();
      Renderer.render();
      UI.updatePropertiesPanel();
      UI.updateToolbarState();
    },

    clear() {
      state.history.undo = [];
      state.history.redo = [];
      state.history.pendingSnapshot = null;
      state.autoSave.dirty = false;
      UI.updateToolbarState();
    }
  };

  function withHistory(mutator) {
    History.begin();
    mutator();
    History.commit();
    Renderer.requestRender();
    UI.updateToolbarState();
  }

  // ===== Geometry =====
  // Koordinat dönüşümleri ve geometri yardımcıları.
  function getCanvasPoint(clientX, clientY) {
    const point = refs.canvas.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = refs.canvas.getScreenCTM();
    if (!ctm) {
      return { x: 0, y: 0 };
    }
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function getWorldPointFromEvent(event) {
    const point = refs.canvas.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = refs.viewport.getScreenCTM();
    if (!ctm) {
      return { x: 0, y: 0 };
    }
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function getVisibleWorldBounds() {
    const box = refs.canvas.getBoundingClientRect();
    const width = Math.max(1, box.width || refs.canvas.clientWidth || 1);
    const height = Math.max(1, box.height || refs.canvas.clientHeight || 1);

    return {
      left: (0 - state.ui.panX) / state.ui.scale,
      top: (0 - state.ui.panY) / state.ui.scale,
      right: (width - state.ui.panX) / state.ui.scale,
      bottom: (height - state.ui.panY) / state.ui.scale
    };
  }

  function getAnchorPoint(node, anchor) {
    switch (anchor) {
      case "top":
        return { x: node.x + node.w / 2, y: node.y };
      case "right":
        return { x: node.x + node.w, y: node.y + node.h / 2 };
      case "bottom":
        return { x: node.x + node.w / 2, y: node.y + node.h };
      case "left":
      default:
        return { x: node.x, y: node.y + node.h / 2 };
    }
  }

  function getNearestAnchorForPoint(node, worldPoint) {
    let bestAnchor = "right";
    let bestDistance = Number.POSITIVE_INFINITY;

    ANCHORS.forEach((anchor) => {
      const point = getAnchorPoint(node, anchor);
      const dx = point.x - worldPoint.x;
      const dy = point.y - worldPoint.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAnchor = anchor;
      }
    });

    return bestAnchor;
  }

  function getGroupRepresentativeNodeId(group, anchor) {
    const members = (group.nodeIds || []).map((nodeId) => getNodeById(nodeId)).filter(Boolean);
    if (!members.length) {
      return null;
    }

    if (anchor === "left") {
      return members.reduce((best, node) => (node.x < best.x ? node : best)).id;
    }
    if (anchor === "right") {
      return members.reduce((best, node) => (node.x + node.w > best.x + best.w ? node : best)).id;
    }
    if (anchor === "top") {
      return members.reduce((best, node) => (node.y < best.y ? node : best)).id;
    }
    return members.reduce((best, node) => (node.y + node.h > best.y + best.h ? node : best)).id;
  }

  function removeDuplicatePoints(points) {
    const result = [];
    points.forEach((point) => {
      const last = result[result.length - 1];
      if (!last || Math.abs(last.x - point.x) > 0.01 || Math.abs(last.y - point.y) > 0.01) {
        result.push(point);
      }
    });
    return result;
  }

  function buildOrthogonalPoints(startPoint, endPoint, startAnchor, bend = null) {
    const horizontalStart = startAnchor === "left" || startAnchor === "right";
    const points = [startPoint];

    if (horizontalStart) {
      const rawMidX = Number.isFinite(Number(bend)) ? Number(bend) : (startPoint.x + endPoint.x) / 2;
      const midX = snapAlways(rawMidX);
      points.push({ x: midX, y: startPoint.y });
      points.push({ x: midX, y: endPoint.y });
    } else {
      const rawMidY = Number.isFinite(Number(bend)) ? Number(bend) : (startPoint.y + endPoint.y) / 2;
      const midY = snapAlways(rawMidY);
      points.push({ x: startPoint.x, y: midY });
      points.push({ x: endPoint.x, y: midY });
    }

    points.push(endPoint);
    return removeDuplicatePoints(points);
  }

  function pointsToPath(points) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }

  function pointsToRoundedPath(points, radius) {
    const safePoints = removeDuplicatePoints(points);
    if (safePoints.length < 3 || radius <= 0) {
      return pointsToPath(safePoints);
    }

    let pathData = `M ${safePoints[0].x} ${safePoints[0].y}`;
    for (let i = 1; i < safePoints.length - 1; i += 1) {
      const prev = safePoints[i - 1];
      const current = safePoints[i];
      const next = safePoints[i + 1];
      const toPrev = { x: prev.x - current.x, y: prev.y - current.y };
      const toNext = { x: next.x - current.x, y: next.y - current.y };
      const lenPrev = Math.hypot(toPrev.x, toPrev.y);
      const lenNext = Math.hypot(toNext.x, toNext.y);

      if (lenPrev <= 0.001 || lenNext <= 0.001) {
        pathData += ` L ${current.x} ${current.y}`;
        continue;
      }

      const safeRadius = Math.min(radius, lenPrev / 2, lenNext / 2);
      if (safeRadius <= 0.01) {
        pathData += ` L ${current.x} ${current.y}`;
        continue;
      }

      const inPoint = {
        x: current.x + (toPrev.x / lenPrev) * safeRadius,
        y: current.y + (toPrev.y / lenPrev) * safeRadius
      };
      const outPoint = {
        x: current.x + (toNext.x / lenNext) * safeRadius,
        y: current.y + (toNext.y / lenNext) * safeRadius
      };

      pathData += ` L ${inPoint.x} ${inPoint.y} Q ${current.x} ${current.y} ${outPoint.x} ${outPoint.y}`;
    }

    const last = safePoints[safePoints.length - 1];
    pathData += ` L ${last.x} ${last.y}`;
    return pathData;
  }

  function getDefaultCurveControlPoint(startPoint, endPoint, startAnchor) {
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    const bendSize = clamp(distance * 0.25 + 24, 42, 160);

    if (startAnchor === "left" || startAnchor === "right") {
      return {
        x: midX,
        y: midY + (startAnchor === "right" ? -bendSize : bendSize)
      };
    }

    return {
      x: midX + (startAnchor === "bottom" ? bendSize : -bendSize),
      y: midY
    };
  }

  function getQuadraticPointAt(start, control, end, t) {
    const oneMinusT = 1 - t;
    return {
      x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
      y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y
    };
  }

  function getEdgeGeometry(edge) {
    const endpoints = getEdgeEndpoints(edge);
    if (!endpoints) {
      return null;
    }

    const route = normalizeEdgeRoute(edge.route);
    const startPoint = endpoints.fromPoint;
    const endPoint = endpoints.toPoint;

    if (route.type === "straight") {
      const points = [startPoint, endPoint];
      return {
        pathData: pointsToPath(points),
        labelPoint: getPolylineMidPoint(points),
        controlHandle: null
      };
    }

    if (route.type === "curved") {
      const defaultControl = getDefaultCurveControlPoint(startPoint, endPoint, edge.from.anchor);
      const controlPoint = {
        x: Number.isFinite(route.controlX) ? route.controlX : defaultControl.x,
        y: Number.isFinite(route.controlY) ? route.controlY : defaultControl.y
      };
      return {
        pathData: `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`,
        labelPoint: getQuadraticPointAt(startPoint, controlPoint, endPoint, 0.5),
        controlHandle: {
          kind: "curve-control",
          axis: "xy",
          x: controlPoint.x,
          y: controlPoint.y
        }
      };
    }

    const points = buildOrthogonalPoints(startPoint, endPoint, edge.from.anchor, route.bend);
    const pathData =
      route.cornerRadius > 0 ? pointsToRoundedPath(points, route.cornerRadius) : pointsToPath(points);
    const horizontalStart = edge.from.anchor === "left" || edge.from.anchor === "right";
    let controlHandle = null;

    if (horizontalStart && points.length >= 3) {
      const bendX = points[1].x;
      controlHandle = {
        kind: "orth-bend",
        axis: "x",
        x: bendX,
        y: (startPoint.y + endPoint.y) / 2
      };
    } else if (!horizontalStart && points.length >= 3) {
      const bendY = points[1].y;
      controlHandle = {
        kind: "orth-bend",
        axis: "y",
        x: (startPoint.x + endPoint.x) / 2,
        y: bendY
      };
    }

    return {
      pathData,
      labelPoint: getPolylineMidPoint(points),
      controlHandle
    };
  }

  function getPolylineMidPoint(points) {
    if (!points.length) {
      return { x: 0, y: 0 };
    }
    if (points.length === 1) {
      return { x: points[0].x, y: points[0].y };
    }

    const segmentLengths = [];
    let total = 0;

    for (let i = 0; i < points.length - 1; i += 1) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const length = Math.sqrt(dx * dx + dy * dy);
      segmentLengths.push(length);
      total += length;
    }

    if (total <= 0) {
      return { x: points[0].x, y: points[0].y };
    }

    const half = total / 2;
    let cumulative = 0;
    for (let i = 0; i < segmentLengths.length; i += 1) {
      const segLength = segmentLengths[i];
      if (cumulative + segLength >= half) {
        const ratio = (half - cumulative) / segLength;
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
          y: points[i].y + (points[i + 1].y - points[i].y) * ratio
        };
      }
      cumulative += segLength;
    }

    return { x: points[points.length - 1].x, y: points[points.length - 1].y };
  }

  function getNodeBounds(node) {
    return {
      left: node.x,
      right: node.x + node.w,
      top: node.y,
      bottom: node.y + node.h
    };
  }

  function rectsIntersect(a, b) {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function isPointInsideRect(point, rect, padding = 0) {
    return (
      point.x >= rect.left - padding &&
      point.x <= rect.right + padding &&
      point.y >= rect.top - padding &&
      point.y <= rect.bottom + padding
    );
  }

  function getEdgeEndWorldPoint(end) {
    if (end?.point && Number.isFinite(end.point.x) && Number.isFinite(end.point.y)) {
      return { point: { x: end.point.x, y: end.point.y }, groupId: null };
    }

    if (!end?.nodeId) {
      return null;
    }

    const collapsedGroup = getCollapsedGroupForNode(end.nodeId);
    if (collapsedGroup) {
      const frame = computeCollapsedGroupFrame(collapsedGroup);
      return {
        point: getRectAnchorPoint(frame, normalizeAnchor(end.anchor)),
        groupId: collapsedGroup.id
      };
    }

    const node = getNodeById(end.nodeId);
    if (!node) {
      return null;
    }
    return {
      point: getAnchorPoint(node, normalizeAnchor(end.anchor)),
      groupId: null
    };
  }

  function getEdgeEndpoints(edge) {
    const fromEndpoint = getEdgeEndWorldPoint(edge.from);
    const toEndpoint = getEdgeEndWorldPoint(edge.to);
    if (!fromEndpoint || !toEndpoint) {
      return null;
    }
    if (fromEndpoint.groupId && toEndpoint.groupId && fromEndpoint.groupId === toEndpoint.groupId) {
      return null;
    }
    return {
      fromPoint: fromEndpoint.point,
      toPoint: toEndpoint.point
    };
  }

  function getEdgeStrokeColor(edge) {
    return sanitizeColor(edge?.style?.stroke, defaultEdgeStyle.stroke);
  }

  // ===== Render =====
  // Render katmanı: modeli SVG olarak çizer.
  const Renderer = {
    requestRender() {
      if (state.rafPending) {
        return;
      }
      state.rafPending = true;
      window.requestAnimationFrame(() => {
        state.rafPending = false;
        Renderer.render();
      });
    },

    render() {
      refs.viewport.setAttribute(
        "transform",
        `translate(${state.ui.panX} ${state.ui.panY}) scale(${state.ui.scale})`
      );
      refs.gridRect.style.display = state.ui.showGrid ? "block" : "none";

      if (refs.pageLayer) {
        refs.pageLayer.replaceChildren();
      }
      refs.edgeLayer.replaceChildren();
      if (refs.groupLayer) {
        refs.groupLayer.replaceChildren();
      }
      refs.nodeLayer.replaceChildren();
      refs.overlayLayer.replaceChildren();

      const orderedNodes = [...state.doc.nodes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      const singleSelectedNodeId = state.selectedNodeIds.size === 1 ? [...state.selectedNodeIds][0] : null;

      state.doc.edges.forEach((edge) => {
        const edgeElement = Renderer.buildEdgeElement(edge, edge.id === state.selectedEdgeId, true);
        if (edgeElement) {
          refs.edgeLayer.appendChild(edgeElement);
        }
      });

      Renderer.renderGroups();

      orderedNodes.forEach((node) => {
        if (!isNodeVisible(node.id)) {
          return;
        }
        const isSelected = state.selectedNodeIds.has(node.id);
        const showAnchors =
          state.interaction.mode === "connect" ||
          state.interaction.mode === "edge-endpoint" ||
          (isSelected && singleSelectedNodeId === node.id);
        const showHandles =
          isSelected && singleSelectedNodeId === node.id && state.interaction.mode !== "connect";
        const nodeElement = Renderer.buildNodeElement(node, {
          interactive: true,
          selected: isSelected,
          showAnchors,
          showHandles
        });
        refs.nodeLayer.appendChild(nodeElement);
      });

      Renderer.renderPageGuides();
      Renderer.renderOverlay();
    },

    renderPageGuides() {
      if (!refs.pageLayer) {
        return;
      }
      const { width: pageWidth, height: pageHeight } = getPdfPageSize();
      const bounds = getVisibleWorldBounds();

      const startCol = Math.floor(bounds.left / pageWidth) - 1;
      const endCol = Math.ceil(bounds.right / pageWidth) + 1;
      const startRow = Math.floor(bounds.top / pageHeight) - 1;
      const endRow = Math.ceil(bounds.bottom / pageHeight) + 1;
      const maxCols = 8;
      const maxRows = 8;

      const colFrom = clamp(startCol, -maxCols, maxCols);
      const colTo = clamp(endCol, -maxCols, maxCols);
      const rowFrom = clamp(startRow, -maxRows, maxRows);
      const rowTo = clamp(endRow, -maxRows, maxRows);

      for (let col = colFrom; col <= colTo; col += 1) {
        for (let row = rowFrom; row <= rowTo; row += 1) {
          const x = col * pageWidth;
          const y = row * pageHeight;
          const rect = createSvgElement("rect", {
            class: "page-guide",
            x,
            y,
            width: pageWidth,
            height: pageHeight
          });
          refs.pageLayer.appendChild(rect);

          const label = createSvgElement("text", {
            class: "page-guide-label",
            x: x + 14,
            y: y + 18
          });
          label.textContent = `${col + 1}, ${row + 1}`;
          refs.pageLayer.appendChild(label);
        }
      }
    },

    renderGroups(options = {}) {
      if (!refs.groupLayer || !Array.isArray(state.doc.groups)) {
        return;
      }
      const showSelection = options.showSelection !== false;

      state.doc.groups.forEach((group) => {
        ensureGroupDefaults(group);
        if (!Array.isArray(group.nodeIds) || !group.nodeIds.length) {
          return;
        }
        const selected = showSelection && state.selectedGroupId === group.id;
        if (group.collapsed) {
          const frame = computeCollapsedGroupFrame(group);
          const collapsed = createSvgElement("g", {
            class: `group-item group-collapsed${selected ? " selected" : ""}`,
            "data-group-id": group.id
          });
          collapsed.appendChild(Renderer.buildGroupCollapsedBlock(group, frame));
          collapsed.appendChild(
            Renderer.buildGroupToggle(group.id, frame.x + frame.w - 14, frame.y + 14, "+")
          );
          refs.groupLayer.appendChild(collapsed);
        } else {
          const frame = getGroupExpandedFrame(group);
          if (!frame) {
            return;
          }
          const expanded = createSvgElement("g", {
            class: `group-item group-expanded${selected ? " selected" : ""}`,
            "data-group-id": group.id
          });
          const shapeStyle = group.shapeStyle || {};
          const textStyle = group.textStyle || {};
          const strokeColor = sanitizeColor(shapeStyle.stroke, "#0f766e");
          const fillColor = sanitizeColor(shapeStyle.fill, "#ffffff");
          const radius = clamp(Number(shapeStyle.radius) || 12, 0, 80);
          const strokeWidth = clamp(Number(shapeStyle.strokeWidth) || 2, 1, 20);
          const displayLabel = String(group.text || "").trim() || "Grup";

          expanded.appendChild(
            createSvgElement("rect", {
              class: "group-box",
              x: frame.x,
              y: frame.y,
              width: frame.w,
              height: frame.h,
              rx: radius,
              ry: radius,
              fill: fillColor,
              "fill-opacity": "0.12",
              stroke: strokeColor,
              "stroke-width": strokeWidth
            })
          );
          const title = createSvgElement("text", {
            class: "group-title-label",
            x: frame.x + 12,
            y: frame.y + 14,
            "font-family": textStyle.fontFamily || defaultTextStyle.fontFamily,
            "font-size": clamp(Number(textStyle.fontSize) || 10, 8, 24),
            "font-weight": textStyle.bold ? "700" : "500",
            "font-style": textStyle.italic ? "italic" : "normal",
            fill: sanitizeColor(textStyle.color, strokeColor)
          });
          title.textContent = `${displayLabel} (${group.nodeIds.length})`;
          expanded.appendChild(title);
          expanded.appendChild(
            Renderer.buildGroupToggle(group.id, frame.x + frame.w - 14, frame.y + 14, "-")
          );
          refs.groupLayer.appendChild(expanded);
        }
      });
    },

    buildGroupCollapsedBlock(group, frame) {
      const label = String(group.text || "").trim() || "Grup";
      const pseudoNode = {
        id: `group_${group.id}`,
        type: group.type || "yuvarlatilmis",
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h,
        text: label,
        textStyle: group.textStyle || cloneDeep(defaultTextStyle),
        shapeStyle: group.shapeStyle || cloneDeep(defaultShapeStyle),
        zIndex: 0
      };
      const nodeElement = Renderer.buildNodeElement(pseudoNode, {
        interactive: false,
        selected: false,
        showAnchors: false,
        showHandles: false
      });
      nodeElement.classList.remove("node");
      nodeElement.classList.add("group-collapsed-body");
      nodeElement.removeAttribute("data-node-id");
      return nodeElement;
    },

    buildGroupToggle(groupId, cx, cy, symbol) {
      const toggle = createSvgElement("g", {
        class: "group-toggle",
        "data-group-id": groupId,
        transform: `translate(${cx} ${cy})`
      });
      toggle.appendChild(
        createSvgElement("rect", {
          x: -8,
          y: -8,
          width: 16,
          height: 16,
          rx: 4,
          ry: 4,
          class: "group-toggle-box"
        })
      );
      const label = createSvgElement("text", {
        x: 0,
        y: 0,
        class: "group-toggle-label",
        "text-anchor": "middle",
        "dominant-baseline": "middle"
      });
      label.textContent = symbol;
      toggle.appendChild(label);
      return toggle;
    },

    buildNodeElement(node, options) {
      const group = createSvgElement("g", {
        class: `node${options.selected ? " selected" : ""}`,
        "data-node-id": node.id,
        transform: `translate(${node.x} ${node.y})`
      });

      const shapeStyle = node.shapeStyle || defaultShapeStyle;
      const fillColor = shapeStyle.fill || defaultShapeStyle.fill;
      const strokeColor = shapeStyle.stroke || defaultShapeStyle.stroke;
      const strokeWidth = Number(shapeStyle.strokeWidth) || defaultShapeStyle.strokeWidth;

      const appendMainShape = (shape) => {
        shape.setAttribute("class", "node-shape");
        shape.setAttribute("fill", fillColor);
        shape.setAttribute("stroke", strokeColor);
        shape.setAttribute("stroke-width", strokeWidth);
        shape.setAttribute("vector-effect", "non-scaling-stroke");
        group.appendChild(shape);
      };

      const appendShapeDetail = (shape) => {
        shape.setAttribute("class", "node-shape node-shape-detail");
        shape.setAttribute("fill", "none");
        shape.setAttribute("stroke", strokeColor);
        shape.setAttribute("stroke-width", Math.max(1, strokeWidth * 0.8));
        shape.setAttribute("vector-effect", "non-scaling-stroke");
        group.appendChild(shape);
      };

      if (node.type === "oval") {
        appendMainShape(
          createSvgElement("ellipse", {
            cx: node.w / 2,
            cy: node.h / 2,
            rx: node.w / 2,
            ry: node.h / 2
          })
        );
      } else if (node.type === "elmas") {
        appendMainShape(
          createSvgElement("polygon", {
            points: `${node.w / 2},0 ${node.w},${node.h / 2} ${node.w / 2},${node.h} 0,${node.h / 2}`
          })
        );
      } else if (node.type === "paralelkenar") {
        const slant = Math.min(34, Math.max(16, node.w * 0.16));
        appendMainShape(
          createSvgElement("polygon", {
            points: `${slant},0 ${node.w},0 ${node.w - slant},${node.h} 0,${node.h}`
          })
        );
      } else if (node.type === "silindir") {
        const rx = node.w / 2;
        const ry = Math.min(22, Math.max(10, node.h * 0.18));
        appendMainShape(
          createSvgElement("path", {
            d: `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${node.w} ${ry} L ${node.w} ${node.h - ry} A ${rx} ${ry} 0 0 1 0 ${
              node.h - ry
            } Z`
          })
        );
        appendShapeDetail(
          createSvgElement("path", {
            d: `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${node.w} ${ry}`
          })
        );
        appendShapeDetail(
          createSvgElement("path", {
            d: `M 0 ${node.h - ry} A ${rx} ${ry} 0 0 0 ${node.w} ${node.h - ry}`
          })
        );
      } else if (node.type === "belge") {
        const wave = Math.min(18, Math.max(8, node.h * 0.22));
        appendMainShape(
          createSvgElement("path", {
            d: `M 0 0 H ${node.w} V ${node.h - wave} C ${node.w * 0.82} ${node.h + wave * 0.45}, ${node.w * 0.62} ${
              node.h - wave * 1.15
            }, ${node.w * 0.42} ${node.h - wave} C ${node.w * 0.25} ${node.h + wave * 0.35}, ${node.w * 0.1} ${
              node.h - wave * 1.05
            }, 0 ${node.h - wave * 0.2} Z`
          })
        );
      } else if (node.type === "altSurec") {
        appendMainShape(
          createSvgElement("rect", {
            x: 0,
            y: 0,
            width: node.w,
            height: node.h,
            rx: Math.max(8, Number(shapeStyle.radius) || 0),
            ry: Math.max(8, Number(shapeStyle.radius) || 0)
          })
        );
        const inset = Math.min(22, Math.max(12, node.w * 0.1));
        appendShapeDetail(
          createSvgElement("line", {
            x1: inset,
            y1: 8,
            x2: inset,
            y2: node.h - 8
          })
        );
        appendShapeDetail(
          createSvgElement("line", {
            x1: node.w - inset,
            y1: 8,
            x2: node.w - inset,
            y2: node.h - 8
          })
        );
      } else if (node.type === "not") {
        const fold = Math.min(24, Math.max(12, node.w * 0.16));
        appendMainShape(
          createSvgElement("path", {
            d: `M 0 0 H ${node.w - fold} L ${node.w} ${fold} V ${node.h} H 0 Z`
          })
        );
        appendShapeDetail(
          createSvgElement("polyline", {
            points: `${node.w - fold},0 ${node.w - fold},${fold} ${node.w},${fold}`
          })
        );
      } else {
        const roundRadius = node.type === "yuvarlatilmis" ? Math.max(18, Number(shapeStyle.radius) || 24) : Number(shapeStyle.radius) || 0;
        appendMainShape(
          createSvgElement("rect", {
            x: 0,
            y: 0,
            width: node.w,
            height: node.h,
            rx: roundRadius,
            ry: roundRadius
          })
        );
      }

      const textStyle = node.textStyle || defaultTextStyle;
      const latex = parseLatexExpression(node.text || "");
      const renderedMath = latex
        ? Renderer.applyMathLayout(group, node, latex, textStyle.color || defaultTextStyle.color)
        : false;
      if (!renderedMath) {
        const text = createSvgElement("text", {
          class: "node-text",
          "font-family": textStyle.fontFamily || defaultTextStyle.fontFamily,
          "font-size": Number(textStyle.fontSize) || defaultTextStyle.fontSize,
          fill: textStyle.color || defaultTextStyle.color,
          "font-weight": textStyle.bold ? "700" : "400",
          "font-style": textStyle.italic ? "italic" : "normal"
        });
        Renderer.applyTextLayout(text, node.text || "", node, textStyle.align || "center");
        group.appendChild(text);
      }

      if (options.interactive && options.showAnchors) {
        Renderer.appendAnchors(group, node);
      }
      if (options.interactive && options.showHandles) {
        Renderer.appendResizeHandles(group, node);
      }

      return group;
    },

    applyTextLayout(textEl, rawText, node, align) {
      const lines = String(rawText || "").split(/\r?\n/);
      const safeAlign = ["left", "center", "right"].includes(align) ? align : "center";
      const xMap = {
        left: 8,
        center: node.w / 2,
        right: node.w - 8
      };
      const anchorMap = {
        left: "start",
        center: "middle",
        right: "end"
      };
      const fontSize = Number(textEl.getAttribute("font-size")) || 14;
      const lineHeight = fontSize * 1.2;
      const totalHeight = lineHeight * lines.length;
      const startY = node.h / 2 - totalHeight / 2 + lineHeight * 0.82;

      textEl.setAttribute("text-anchor", anchorMap[safeAlign]);
      textEl.setAttribute("dominant-baseline", "middle");

      lines.forEach((line, index) => {
        const tspan = createSvgElement("tspan", {
          x: xMap[safeAlign],
          y: startY + index * lineHeight
        });
        tspan.textContent = line;
        textEl.appendChild(tspan);
      });
    },

    applyMathLayout(group, node, latex, color) {
      const glyph = Renderer.getMathGlyph(latex.expr, Boolean(latex.display), color);
      if (!glyph) {
        return false;
      }

      const maxWidth = Math.max(24, node.w - 18);
      const maxHeight = Math.max(20, node.h - 16);
      const scale = Math.min(maxWidth / glyph.width, maxHeight / glyph.height);
      if (!Number.isFinite(scale) || scale <= 0) {
        return false;
      }

      const renderW = glyph.width * scale;
      const renderH = glyph.height * scale;
      const tx = node.w / 2 - renderW / 2;
      const ty = node.h / 2 - renderH / 2;

      const mathGroup = createSvgElement("g", {
        class: "node-math",
        transform: `translate(${tx} ${ty}) scale(${scale})`
      });
      mathGroup.appendChild(glyph.element);
      group.appendChild(mathGroup);
      return true;
    },

    getMathGlyph(expression, displayMode, color) {
      const safeExpression = String(expression || "").trim();
      if (!safeExpression || !window.MathJax || typeof window.MathJax.tex2svg !== "function") {
        return null;
      }

      const safeColor = sanitizeColor(color, defaultTextStyle.color);
      const cacheKey = `${displayMode ? "d" : "i"}|${safeColor}|${safeExpression}`;
      const cached = mathCache.get(cacheKey);
      if (cached) {
        return {
          width: cached.width,
          height: cached.height,
          element: cached.template.cloneNode(true)
        };
      }

      try {
        const mathWrapper = window.MathJax.tex2svg(safeExpression, { display: displayMode });
        const mathSvg = mathWrapper.querySelector("svg");
        const viewBoxRaw = mathSvg ? mathSvg.getAttribute("viewBox") : "";
        const viewBoxParts = String(viewBoxRaw)
          .trim()
          .split(/\s+/)
          .map((part) => Number(part));
        if (!mathSvg || viewBoxParts.length !== 4 || !Number.isFinite(viewBoxParts[2]) || !Number.isFinite(viewBoxParts[3])) {
          return null;
        }

        const minX = viewBoxParts[0];
        const minY = viewBoxParts[1];
        const width = viewBoxParts[2];
        const height = viewBoxParts[3];
        const template = createSvgElement("g", {
          transform: `translate(${-minX} ${-minY})`
        });
        Array.from(mathSvg.children).forEach((child) => {
          template.appendChild(child.cloneNode(true));
        });
        template.setAttribute("fill", safeColor);
        template.setAttribute("stroke", "none");

        mathCache.set(cacheKey, { width, height, template });
        return {
          width,
          height,
          element: template.cloneNode(true)
        };
      } catch (error) {
        console.warn("MathJax formül render hatası:", error);
        return null;
      }
    },

    appendAnchors(group, node) {
      const anchors = {
        top: { x: node.w / 2, y: 0 },
        right: { x: node.w, y: node.h / 2 },
        bottom: { x: node.w / 2, y: node.h },
        left: { x: 0, y: node.h / 2 }
      };

      ANCHORS.forEach((anchor) => {
        const point = anchors[anchor];
        const anchorEl = createSvgElement("circle", {
          class: "anchor",
          cx: point.x,
          cy: point.y,
          r: 5,
          "data-node-id": node.id,
          "data-anchor": anchor
        });
        group.appendChild(anchorEl);
      });
    },

    appendResizeHandles(group, node) {
      const o = RESIZE_HANDLE_OUTSET;
      const handles = {
        nw: { x: -o, y: -o },
        n: { x: node.w / 2, y: -o },
        ne: { x: node.w + o, y: -o },
        e: { x: node.w + o, y: node.h / 2 },
        se: { x: node.w + o, y: node.h + o },
        s: { x: node.w / 2, y: node.h + o },
        sw: { x: -o, y: node.h + o },
        w: { x: -o, y: node.h / 2 }
      };

      Object.entries(handles).forEach(([name, point]) => {
        const handle = createSvgElement("rect", {
          class: "resize-handle",
          x: point.x - 4,
          y: point.y - 4,
          width: 8,
          height: 8,
          "data-node-id": node.id,
          "data-handle": name
        });
        group.appendChild(handle);
      });
    },

    buildEdgeElement(edge, selected, interactive, markerIdByStrokeColor = null) {
      const geometry = getEdgeGeometry(edge);
      if (!geometry) {
        return null;
      }

      const edgeStyle = edge.style || defaultEdgeStyle;
      const strokeColor = getEdgeStrokeColor(edge);
      const strokeWidth = Number(edgeStyle.strokeWidth) || defaultEdgeStyle.strokeWidth;

      const group = createSvgElement("g", {
        class: `edge${selected ? " selected" : ""}`,
        "data-edge-id": edge.id
      });

      const path = createSvgElement("path", {
        class: "edge-path",
        d: geometry.pathData,
        fill: "none",
        stroke: strokeColor,
        "stroke-width": strokeWidth,
        "stroke-dasharray": edgeStyle.dashed ? "7 5" : "none",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke"
      });
      if (edgeStyle.arrow) {
        if (markerIdByStrokeColor instanceof Map && markerIdByStrokeColor.size) {
          const markerId = markerIdByStrokeColor.get(strokeColor.toLowerCase());
          if (markerId) {
            path.setAttribute("marker-end", `url(#${markerId})`);
          }
        } else {
          path.setAttribute("marker-end", "url(#arrowHead)");
        }
      }
      group.appendChild(path);

      if (interactive) {
        const hitPath = createSvgElement("path", {
          class: "edge-hit",
          d: geometry.pathData,
          fill: "none"
        });
        group.appendChild(hitPath);
      }

      if (edge.label && edge.label.text) {
        const labelPoint = geometry.labelPoint;
        const labelOffsetX = Number.isFinite(Number(edge.label.offsetX)) ? Number(edge.label.offsetX) : 0;
        const labelOffsetY = Number.isFinite(Number(edge.label.offsetY)) ? Number(edge.label.offsetY) : 0;
        const label = createSvgElement("text", {
          class: "edge-label",
          x: labelPoint.x + labelOffsetX,
          y: labelPoint.y - 6 + labelOffsetY,
          "data-edge-id": edge.id,
          "data-edge-label": "1",
          "font-size": Number(edge.label.fontSize) || defaultEdgeLabel.fontSize,
          fill: edge.label.color || defaultEdgeLabel.color,
          "font-weight": "600",
          "text-anchor": "middle",
          "dominant-baseline": "middle"
        });
        label.textContent = edge.label.text;
        group.appendChild(label);
      }

      return group;
    },

    renderOverlay() {
      if (state.interaction.mode === "marquee" && state.interaction.startWorld && state.interaction.currentWorld) {
        const left = Math.min(state.interaction.startWorld.x, state.interaction.currentWorld.x);
        const top = Math.min(state.interaction.startWorld.y, state.interaction.currentWorld.y);
        const width = Math.abs(state.interaction.startWorld.x - state.interaction.currentWorld.x);
        const height = Math.abs(state.interaction.startWorld.y - state.interaction.currentWorld.y);
        const rect = createSvgElement("rect", {
          class: "marquee",
          x: left,
          y: top,
          width,
          height
        });
        refs.overlayLayer.appendChild(rect);
      }

      if (state.interaction.mode === "connect" && state.interaction.connectFrom && state.interaction.currentWorld) {
        const fromNode = getNodeById(state.interaction.connectFrom.nodeId);
        if (!fromNode) {
          return;
        }
        const fromPoint = getAnchorPoint(fromNode, state.interaction.connectFrom.anchor);
        const previewTarget = {
          x: snapAlways(state.interaction.currentWorld.x),
          y: snapAlways(state.interaction.currentWorld.y)
        };
        const previewPoints = buildOrthogonalPoints(
          fromPoint,
          previewTarget,
          state.interaction.connectFrom.anchor
        );
        const path = createSvgElement("path", {
          class: "connection-preview",
          d: pointsToPath(previewPoints)
        });
        refs.overlayLayer.appendChild(path);
      }

      if (state.selectedEdgeId) {
        const selectedEdge = getEdgeById(state.selectedEdgeId);
        const geometry = selectedEdge ? getEdgeGeometry(selectedEdge) : null;
        if (geometry?.controlHandle) {
          const handle = createSvgElement("circle", {
            class: "edge-control-handle",
            cx: geometry.controlHandle.x,
            cy: geometry.controlHandle.y,
            r: 6,
            "data-edge-id": selectedEdge.id,
            "data-handle-kind": geometry.controlHandle.kind,
            "data-axis": geometry.controlHandle.axis
          });
          refs.overlayLayer.appendChild(handle);
        }
        if (selectedEdge) {
          const endpoints = getEdgeEndpoints(selectedEdge);
          if (endpoints) {
            const startHandle = createSvgElement("circle", {
              class: "edge-endpoint-handle",
              cx: endpoints.fromPoint.x,
              cy: endpoints.fromPoint.y,
              r: 5,
              "data-edge-id": selectedEdge.id,
              "data-end": "from"
            });
            const endHandle = createSvgElement("circle", {
              class: "edge-endpoint-handle",
              cx: endpoints.toPoint.x,
              cy: endpoints.toPoint.y,
              r: 5,
              "data-edge-id": selectedEdge.id,
              "data-end": "to"
            });
            refs.overlayLayer.appendChild(startHandle);
            refs.overlayLayer.appendChild(endHandle);
          }
        }
      }

      const singleSelectedNodeId = state.selectedNodeIds.size === 1 ? [...state.selectedNodeIds][0] : null;
      if (
        singleSelectedNodeId &&
        !state.selectedEdgeId &&
        (state.interaction.mode === null || state.interaction.mode === "pan")
      ) {
        const node = getNodeById(singleSelectedNodeId);
        if (node) {
          Renderer.appendQuickAddArrows(node);
        }
      }
    },

    appendQuickAddArrows(node) {
      const positions = {
        top: { x: node.x + node.w / 2, y: node.y - QUICK_ARROW_DISTANCE },
        right: { x: node.x + node.w + QUICK_ARROW_DISTANCE, y: node.y + node.h / 2 },
        bottom: { x: node.x + node.w / 2, y: node.y + node.h + QUICK_ARROW_DISTANCE },
        left: { x: node.x - QUICK_ARROW_DISTANCE, y: node.y + node.h / 2 }
      };

      Object.entries(positions).forEach(([direction, point]) => {
        const arrow = createSvgElement("g", {
          class: "quick-add-arrow",
          "data-node-id": node.id,
          "data-direction": direction,
          transform: `translate(${point.x} ${point.y})`
        });

        arrow.appendChild(
          createSvgElement("circle", {
            class: "quick-add-arrow-circle",
            cx: 0,
            cy: 0,
            r: 10
          })
        );

        const glyphMap = {
          top: "M 0 4 L 0 -4 M 0 -4 L -3 -1 M 0 -4 L 3 -1",
          right: "M -4 0 L 4 0 M 4 0 L 1 -3 M 4 0 L 1 3",
          bottom: "M 0 -4 L 0 4 M 0 4 L -3 1 M 0 4 L 3 1",
          left: "M 4 0 L -4 0 M -4 0 L -1 -3 M -4 0 L -1 3"
        };
        arrow.appendChild(
          createSvgElement("path", {
            class: "quick-add-arrow-glyph",
            d: glyphMap[direction]
          })
        );

        refs.overlayLayer.appendChild(arrow);
      });
    },

    createStaticSvg(bounds) {
      const width = Math.max(200, bounds.maxX - bounds.minX);
      const height = Math.max(150, bounds.maxY - bounds.minY);

      const svg = createSvgElement("svg", {
        xmlns: SVG_NS,
        width,
        height,
        viewBox: `${bounds.minX} ${bounds.minY} ${width} ${height}`
      });

      const defs = createSvgElement("defs");
      const markerIdByStrokeColor = new Map();
      const exportArrowColors = new Set(
        state.doc.edges
          .filter((edge) => (edge.style || defaultEdgeStyle).arrow)
          .map((edge) => getEdgeStrokeColor(edge).toLowerCase())
      );
      exportArrowColors.forEach((color, index) => {
        const markerId = `arrowHeadExport${index + 1}`;
        const marker = createSvgElement("marker", {
          id: markerId,
          markerWidth: 10,
          markerHeight: 10,
          refX: 9,
          refY: 5,
          orient: "auto",
          markerUnits: "strokeWidth"
        });
        const markerPath = createSvgElement("path", {
          d: "M0,0 L10,5 L0,10 Z",
          fill: color
        });
        marker.appendChild(markerPath);
        defs.appendChild(marker);
        markerIdByStrokeColor.set(color, markerId);
      });
      svg.appendChild(defs);

      const background = createSvgElement("rect", {
        x: bounds.minX,
        y: bounds.minY,
        width,
        height,
        fill: "#ffffff"
      });
      svg.appendChild(background);

      const edgeLayer = createSvgElement("g");
      state.doc.edges.forEach((edge) => {
        const edgeEl = Renderer.buildEdgeElement(edge, false, false, markerIdByStrokeColor);
        if (edgeEl) {
          edgeLayer.appendChild(edgeEl);
        }
      });
      svg.appendChild(edgeLayer);

      const groupLayer = createSvgElement("g");
      if (refs.groupLayer) {
        const previousGroupLayer = refs.groupLayer;
        refs.groupLayer = groupLayer;
        Renderer.renderGroups({ showSelection: false });
        refs.groupLayer = previousGroupLayer;
      }
      svg.appendChild(groupLayer);

      const nodeLayer = createSvgElement("g");
      [...state.doc.nodes]
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        .forEach((node) => {
          if (!isNodeVisible(node.id)) {
            return;
          }
          const nodeEl = Renderer.buildNodeElement(node, {
            interactive: false,
            selected: false,
            showAnchors: false,
            showHandles: false
          });
          nodeLayer.appendChild(nodeEl);
        });
      svg.appendChild(nodeLayer);

      return svg;
    }
  };

  // ===== Serialization =====
  // XML serileştirme/parse katmanı.
  const Serialization = {
    toXml(doc) {
      const lines = [];
      lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
      const appName = doc.meta?.app || "FlowChartTR";
      const createdAt = doc.meta?.createdAt || new Date().toISOString();
      lines.push(
        `<flowchart version="1.0" app="${escapeXml(appName)}" createdAt="${escapeXml(createdAt)}">`
      );
      lines.push(`  <nodes>`);

      doc.nodes.forEach((node) => {
        const textStyle = node.textStyle || defaultTextStyle;
        const shapeStyle = node.shapeStyle || defaultShapeStyle;

        lines.push(
          `    <node id="${escapeXml(node.id)}" type="${escapeXml(node.type)}" x="${node.x}" y="${node.y}" w="${node.w}" h="${node.h}" zIndex="${node.zIndex}">`
        );
        lines.push(
          `      <text fontFamily="${escapeXml(textStyle.fontFamily)}" fontSize="${textStyle.fontSize}" color="${escapeXml(
            textStyle.color
          )}" bold="${textStyle.bold ? "1" : "0"}" italic="${textStyle.italic ? "1" : "0"}" align="${escapeXml(
            textStyle.align
          )}">${escapeXml(node.text || "")}</text>`
        );
        lines.push(
          `      <shape fill="${escapeXml(shapeStyle.fill)}" stroke="${escapeXml(shapeStyle.stroke)}" strokeWidth="${shapeStyle.strokeWidth}" radius="${shapeStyle.radius}" />`
        );
        lines.push(`    </node>`);
      });

      lines.push(`  </nodes>`);
      lines.push(`  <edges>`);

      doc.edges.forEach((edge) => {
        const style = edge.style || defaultEdgeStyle;
        const label = edge.label || defaultEdgeLabel;
        const route = normalizeEdgeRoute(edge.route);
        const bendAttr = route.bend == null ? "" : route.bend;
        const controlXAttr = route.controlX == null ? "" : route.controlX;
        const controlYAttr = route.controlY == null ? "" : route.controlY;
        const fromNode = edge.from?.nodeId || "";
        const toNode = edge.to?.nodeId || "";
        const fromPointX = edge.from?.point && Number.isFinite(edge.from.point.x) ? edge.from.point.x : "";
        const fromPointY = edge.from?.point && Number.isFinite(edge.from.point.y) ? edge.from.point.y : "";
        const toPointX = edge.to?.point && Number.isFinite(edge.to.point.x) ? edge.to.point.x : "";
        const toPointY = edge.to?.point && Number.isFinite(edge.to.point.y) ? edge.to.point.y : "";
        const labelOffsetX = Number.isFinite(Number(label.offsetX)) ? Number(label.offsetX) : 0;
        const labelOffsetY = Number.isFinite(Number(label.offsetY)) ? Number(label.offsetY) : 0;

        lines.push(
          `    <edge id="${escapeXml(edge.id)}" from="${escapeXml(fromNode)}:${escapeXml(
            edge.from.anchor
          )}" to="${escapeXml(toNode)}:${escapeXml(edge.to.anchor)}" fromX="${fromPointX}" fromY="${fromPointY}" toX="${toPointX}" toY="${toPointY}" stroke="${escapeXml(style.stroke)}" strokeWidth="${
            style.strokeWidth
          }" dashed="${style.dashed ? "1" : "0"}" arrow="${style.arrow ? "1" : "0"}" routeType="${escapeXml(
            route.type
          )}" cornerRadius="${route.cornerRadius}" bend="${bendAttr}" controlX="${controlXAttr}" controlY="${controlYAttr}">`
        );
        lines.push(
          `      <label fontSize="${label.fontSize}" color="${escapeXml(label.color)}" offsetX="${labelOffsetX}" offsetY="${labelOffsetY}">${escapeXml(
            label.text || ""
          )}</label>`
        );
        lines.push(`    </edge>`);
      });

      lines.push(`  </edges>`);
      lines.push(`  <groups>`);

      (doc.groups || []).forEach((group) => {
        ensureGroupDefaults(group);
        const nodeIds = Array.isArray(group.nodeIds) ? group.nodeIds : [];
        const frame = computeCollapsedGroupFrame(group);
        const textStyle = group.textStyle || defaultTextStyle;
        const shapeStyle = group.shapeStyle || defaultShapeStyle;
        lines.push(
          `    <group id="${escapeXml(group.id)}" nodes="${escapeXml(nodeIds.join(","))}" collapsed="${
            group.collapsed ? "1" : "0"
          }" x="${frame.x}" y="${frame.y}" w="${frame.w}" h="${frame.h}" text="${escapeXml(
            group.text || ""
          )}" type="${escapeXml(group.type || "yuvarlatilmis")}" fontFamily="${escapeXml(
            textStyle.fontFamily
          )}" fontSize="${textStyle.fontSize}" color="${escapeXml(textStyle.color)}" bold="${
            textStyle.bold ? "1" : "0"
          }" italic="${textStyle.italic ? "1" : "0"}" align="${escapeXml(
            textStyle.align
          )}" fill="${escapeXml(shapeStyle.fill)}" stroke="${escapeXml(shapeStyle.stroke)}" strokeWidth="${
            shapeStyle.strokeWidth
          }" radius="${shapeStyle.radius}" />`
        );
      });

      lines.push(`  </groups>`);
      lines.push(`</flowchart>`);

      return lines.join("\n");
    },

    fromXml(xmlText) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const parseError = xmlDoc.querySelector("parsererror");
      if (parseError) {
        throw new Error("XML biçimi geçerli değil.");
      }

      const root = xmlDoc.getElementsByTagName("flowchart")[0];
      if (!root) {
        throw new Error("Kök etiket <flowchart> bulunamadı.");
      }

      const version = root.getAttribute("version");
      if (version && version !== "1.0") {
        throw new Error(`Desteklenmeyen sürüm: ${version}`);
      }

      const result = createEmptyDocument();
      const usedNodeIds = new Set();
      const usedEdgeIds = new Set();

      const nodesParent = root.getElementsByTagName("nodes")[0];
      const nodeElements = nodesParent ? Array.from(nodesParent.getElementsByTagName("node")) : [];

      nodeElements.forEach((nodeEl, index) => {
        const id = nodeEl.getAttribute("id");
        const type = nodeEl.getAttribute("type");

        if (!id) {
          throw new Error("Bir node öğesinde id eksik.");
        }
        if (usedNodeIds.has(id)) {
          throw new Error(`Node id tekrar ediyor: ${id}`);
        }
        if (!isSupportedNodeType(type)) {
          throw new Error(`Geçersiz node tipi: ${type || "(boş)"}`);
        }

        const node = createNode(type, 0, 0, id);
        node.x = parseNumberAttr(nodeEl.getAttribute("x"), 0);
        node.y = parseNumberAttr(nodeEl.getAttribute("y"), 0);
        node.w = Math.max(MIN_NODE_W, parseNumberAttr(nodeEl.getAttribute("w"), node.w));
        node.h = Math.max(MIN_NODE_H, parseNumberAttr(nodeEl.getAttribute("h"), node.h));
        node.zIndex = parseNumberAttr(nodeEl.getAttribute("zIndex"), index + 1);

        const textEl = nodeEl.getElementsByTagName("text")[0];
        if (textEl) {
          node.text = textEl.textContent || "";
          node.textStyle = {
            fontFamily: textEl.getAttribute("fontFamily") || defaultTextStyle.fontFamily,
            fontSize: parseNumberAttr(textEl.getAttribute("fontSize"), defaultTextStyle.fontSize),
            color: sanitizeColor(textEl.getAttribute("color"), defaultTextStyle.color),
            bold: parseBooleanAttr(textEl.getAttribute("bold"), defaultTextStyle.bold),
            italic: parseBooleanAttr(textEl.getAttribute("italic"), defaultTextStyle.italic),
            align: ["left", "center", "right"].includes(textEl.getAttribute("align"))
              ? textEl.getAttribute("align")
              : defaultTextStyle.align
          };
        }

        const shapeEl = nodeEl.getElementsByTagName("shape")[0];
        if (shapeEl) {
          node.shapeStyle = {
            fill: sanitizeColor(shapeEl.getAttribute("fill"), defaultShapeStyle.fill),
            stroke: sanitizeColor(shapeEl.getAttribute("stroke"), defaultShapeStyle.stroke),
            strokeWidth: Math.max(1, parseNumberAttr(shapeEl.getAttribute("strokeWidth"), defaultShapeStyle.strokeWidth)),
            radius: Math.max(0, parseNumberAttr(shapeEl.getAttribute("radius"), defaultShapeStyle.radius))
          };
        }

        usedNodeIds.add(id);
        result.nodes.push(node);
      });

      const edgesParent = root.getElementsByTagName("edges")[0];
      const edgeElements = edgesParent ? Array.from(edgesParent.getElementsByTagName("edge")) : [];

      edgeElements.forEach((edgeEl) => {
        const id = edgeEl.getAttribute("id");
        if (!id) {
          throw new Error("Bir edge öğesinde id eksik.");
        }
        if (usedEdgeIds.has(id)) {
          throw new Error(`Edge id tekrar ediyor: ${id}`);
        }

        const fromRaw = edgeEl.getAttribute("from") || "";
        const toRaw = edgeEl.getAttribute("to") || "";

        const fromParts = fromRaw.split(":");
        const toParts = toRaw.split(":");

        if (fromParts.length !== 2 || toParts.length !== 2) {
          throw new Error(`Edge uçları geçersiz: ${id}`);
        }

        const fromNodeId = fromParts[0];
        const fromAnchor = normalizeAnchor(fromParts[1]);
        const toNodeId = toParts[0];
        const toAnchor = normalizeAnchor(toParts[1]);
        const fromPoint = {
          x: parseNullableNumberAttr(edgeEl.getAttribute("fromX")),
          y: parseNullableNumberAttr(edgeEl.getAttribute("fromY"))
        };
        const toPoint = {
          x: parseNullableNumberAttr(edgeEl.getAttribute("toX")),
          y: parseNullableNumberAttr(edgeEl.getAttribute("toY"))
        };
        const hasFromPoint = Number.isFinite(fromPoint.x) && Number.isFinite(fromPoint.y);
        const hasToPoint = Number.isFinite(toPoint.x) && Number.isFinite(toPoint.y);

        if (fromNodeId && !usedNodeIds.has(fromNodeId)) {
          throw new Error(`Edge node referansı bulunamadı: ${id}`);
        }
        if (toNodeId && !usedNodeIds.has(toNodeId)) {
          throw new Error(`Edge node referansı bulunamadı: ${id}`);
        }
        if (!fromNodeId && !hasFromPoint) {
          throw new Error(`Edge başlangıcı geçersiz: ${id}`);
        }
        if (!toNodeId && !hasToPoint) {
          throw new Error(`Edge bitişi geçersiz: ${id}`);
        }

        const edge = createEdge(fromNodeId, fromAnchor, toNodeId, toAnchor, id);
        if (!fromNodeId && hasFromPoint) {
          edge.from.point = { x: fromPoint.x, y: fromPoint.y };
        }
        if (!toNodeId && hasToPoint) {
          edge.to.point = { x: toPoint.x, y: toPoint.y };
        }
        edge.style = {
          stroke: sanitizeColor(edgeEl.getAttribute("stroke"), defaultEdgeStyle.stroke),
          strokeWidth: Math.max(1, parseNumberAttr(edgeEl.getAttribute("strokeWidth"), defaultEdgeStyle.strokeWidth)),
          dashed: parseBooleanAttr(edgeEl.getAttribute("dashed"), defaultEdgeStyle.dashed),
          arrow: parseBooleanAttr(edgeEl.getAttribute("arrow"), defaultEdgeStyle.arrow)
        };
        edge.route = normalizeEdgeRoute({
          type: edgeEl.getAttribute("routeType") || defaultEdgeRoute.type,
          cornerRadius: parseNumberAttr(edgeEl.getAttribute("cornerRadius"), defaultEdgeRoute.cornerRadius),
          bend: parseNullableNumberAttr(edgeEl.getAttribute("bend")),
          controlX: parseNullableNumberAttr(edgeEl.getAttribute("controlX")),
          controlY: parseNullableNumberAttr(edgeEl.getAttribute("controlY"))
        });

        const labelEl = edgeEl.getElementsByTagName("label")[0];
        if (labelEl) {
          edge.label = {
            text: labelEl.textContent || "",
            fontSize: Math.max(8, parseNumberAttr(labelEl.getAttribute("fontSize"), defaultEdgeLabel.fontSize)),
            color: sanitizeColor(labelEl.getAttribute("color"), defaultEdgeLabel.color),
            offsetX: parseNumberAttr(labelEl.getAttribute("offsetX"), 0),
            offsetY: parseNumberAttr(labelEl.getAttribute("offsetY"), 0)
          };
        }

        usedEdgeIds.add(id);
        result.edges.push(edge);
      });

      const groupsParent = root.getElementsByTagName("groups")[0];
      const groupElements = groupsParent ? Array.from(groupsParent.getElementsByTagName("group")) : [];
      result.groups = [];
      groupElements.forEach((groupEl) => {
        const groupId = groupEl.getAttribute("id");
        if (!groupId) {
          return;
        }
        const rawNodes = groupEl.getAttribute("nodes") || "";
        const nodeIds = rawNodes
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && usedNodeIds.has(id));
        if (nodeIds.length < 2) {
          return;
        }
        const group = createGroup(nodeIds, groupId);
        group.collapsed = parseBooleanAttr(groupEl.getAttribute("collapsed"), false);
        const textAttr = groupEl.getAttribute("text");
        if (textAttr !== null) {
          group.text = textAttr;
        }
        const typeAttr = groupEl.getAttribute("type");
        if (isSupportedNodeType(typeAttr)) {
          group.type = typeAttr;
        }
        group.textStyle = {
          fontFamily: groupEl.getAttribute("fontFamily") || defaultTextStyle.fontFamily,
          fontSize: parseNumberAttr(groupEl.getAttribute("fontSize"), defaultTextStyle.fontSize),
          color: sanitizeColor(groupEl.getAttribute("color"), defaultTextStyle.color),
          bold: parseBooleanAttr(groupEl.getAttribute("bold"), defaultTextStyle.bold),
          italic: parseBooleanAttr(groupEl.getAttribute("italic"), defaultTextStyle.italic),
          align: ["left", "center", "right"].includes(groupEl.getAttribute("align"))
            ? groupEl.getAttribute("align")
            : defaultTextStyle.align
        };
        group.shapeStyle = {
          fill: sanitizeColor(groupEl.getAttribute("fill"), "#ffffff"),
          stroke: sanitizeColor(groupEl.getAttribute("stroke"), "#0f766e"),
          strokeWidth: Math.max(1, parseNumberAttr(groupEl.getAttribute("strokeWidth"), 2)),
          radius: Math.max(0, parseNumberAttr(groupEl.getAttribute("radius"), 12))
        };
        const frame = {
          x: parseNullableNumberAttr(groupEl.getAttribute("x")),
          y: parseNullableNumberAttr(groupEl.getAttribute("y")),
          w: parseNullableNumberAttr(groupEl.getAttribute("w")),
          h: parseNullableNumberAttr(groupEl.getAttribute("h"))
        };
        group.frame =
          Number.isFinite(frame.x) && Number.isFinite(frame.y) && Number.isFinite(frame.w) && Number.isFinite(frame.h)
            ? frame
            : null;
        result.groups.push(group);
      });

      normalizeImportedDoc(result);
      result.meta.createdAt = root.getAttribute("createdAt") || result.meta.createdAt;
      result.meta.app = root.getAttribute("app") || "FlowChartTR";
      return result;
    }
  };

  function normalizeImportedDoc(doc) {
    doc.nodes.forEach((node, index) => {
      node.type = isSupportedNodeType(node.type) ? node.type : "dikdortgen";
      node.x = Number.isFinite(node.x) ? node.x : 0;
      node.y = Number.isFinite(node.y) ? node.y : 0;
      node.w = Math.max(MIN_NODE_W, Number.isFinite(node.w) ? node.w : 120);
      node.h = Math.max(MIN_NODE_H, Number.isFinite(node.h) ? node.h : 60);
      node.zIndex = Number.isFinite(node.zIndex) ? node.zIndex : index + 1;
      node.text = typeof node.text === "string" ? node.text : "";

      node.textStyle = {
        fontFamily: node.textStyle?.fontFamily || defaultTextStyle.fontFamily,
        fontSize: Math.max(8, Number(node.textStyle?.fontSize) || defaultTextStyle.fontSize),
        color: sanitizeColor(node.textStyle?.color, defaultTextStyle.color),
        bold: Boolean(node.textStyle?.bold),
        italic: Boolean(node.textStyle?.italic),
        align: ["left", "center", "right"].includes(node.textStyle?.align)
          ? node.textStyle.align
          : defaultTextStyle.align
      };

      node.shapeStyle = {
        fill: sanitizeColor(node.shapeStyle?.fill, defaultShapeStyle.fill),
        stroke: sanitizeColor(node.shapeStyle?.stroke, defaultShapeStyle.stroke),
        strokeWidth: Math.max(1, Number(node.shapeStyle?.strokeWidth) || defaultShapeStyle.strokeWidth),
        radius: Math.max(0, Number(node.shapeStyle?.radius) || defaultShapeStyle.radius)
      };
    });

    const nodeIdSet = getNodeIdSet(doc);
    doc.edges = doc.edges.filter((edge) => {
      const hasFromPoint = edge.from?.point && Number.isFinite(Number(edge.from.point.x)) && Number.isFinite(Number(edge.from.point.y));
      const hasToPoint = edge.to?.point && Number.isFinite(Number(edge.to.point.x)) && Number.isFinite(Number(edge.to.point.y));
      const fromNodeOk = !edge.from?.nodeId || nodeIdSet.has(edge.from.nodeId);
      const toNodeOk = !edge.to?.nodeId || nodeIdSet.has(edge.to.nodeId);
      const fromExists = Boolean(edge.from?.nodeId) || hasFromPoint;
      const toExists = Boolean(edge.to?.nodeId) || hasToPoint;
      return fromNodeOk && toNodeOk && fromExists && toExists;
    });

    doc.edges.forEach((edge) => {
      edge.from = edge.from || { nodeId: null, anchor: "right", point: null };
      edge.to = edge.to || { nodeId: null, anchor: "left", point: null };
      edge.from.anchor = normalizeAnchor(edge.from.anchor);
      edge.to.anchor = normalizeAnchor(edge.to.anchor);
      edge.from.nodeId = edge.from?.nodeId || null;
      edge.to.nodeId = edge.to?.nodeId || null;
      if (edge.from?.point && Number.isFinite(Number(edge.from.point.x)) && Number.isFinite(Number(edge.from.point.y))) {
        edge.from.point = { x: snapAlways(Number(edge.from.point.x)), y: snapAlways(Number(edge.from.point.y)) };
      } else {
        edge.from.point = null;
      }
      if (edge.to?.point && Number.isFinite(Number(edge.to.point.x)) && Number.isFinite(Number(edge.to.point.y))) {
        edge.to.point = { x: snapAlways(Number(edge.to.point.x)), y: snapAlways(Number(edge.to.point.y)) };
      } else {
        edge.to.point = null;
      }
      edge.style = {
        stroke: sanitizeColor(edge.style?.stroke, defaultEdgeStyle.stroke),
        strokeWidth: Math.max(1, Number(edge.style?.strokeWidth) || defaultEdgeStyle.strokeWidth),
        dashed: Boolean(edge.style?.dashed),
        arrow: edge.style?.arrow !== false
      };
      edge.route = normalizeEdgeRoute(edge.route);
      edge.label = {
        text: typeof edge.label?.text === "string" ? edge.label.text : "",
        fontSize: Math.max(8, Number(edge.label?.fontSize) || defaultEdgeLabel.fontSize),
        color: sanitizeColor(edge.label?.color, defaultEdgeLabel.color),
        offsetX: Number.isFinite(Number(edge.label?.offsetX)) ? Number(edge.label.offsetX) : 0,
        offsetY: Number.isFinite(Number(edge.label?.offsetY)) ? Number(edge.label.offsetY) : 0
      };
    });

    const normalizedGroups = [];
    const usedNodeIds = new Set();
    (doc.groups || []).forEach((group, index) => {
      const nodeIds = Array.isArray(group.nodeIds)
        ? group.nodeIds.filter((id) => nodeIdSet.has(id) && !usedNodeIds.has(id))
        : [];
      if (nodeIds.length < 2) {
        return;
      }
      nodeIds.forEach((id) => usedNodeIds.add(id));
      const frame =
        group.frame &&
        Number.isFinite(group.frame.x) &&
        Number.isFinite(group.frame.y) &&
        Number.isFinite(group.frame.w) &&
        Number.isFinite(group.frame.h)
          ? {
              x: snapAlways(group.frame.x),
              y: snapAlways(group.frame.y),
              w: Math.max(GROUP_COLLAPSED_MIN_W, snapAlways(group.frame.w)),
              h: Math.max(GROUP_COLLAPSED_MIN_H, snapAlways(group.frame.h))
            }
          : null;
      const normalized = createGroup(nodeIds, group.id || `g_import_${index + 1}`);
      normalized.collapsed = Boolean(group.collapsed);
      normalized.frame = frame;
      normalized.text = typeof group.text === "string" ? group.text : normalized.text;
      if (isSupportedNodeType(group.type)) {
        normalized.type = group.type;
      }
      normalized.textStyle = {
        fontFamily: group.textStyle?.fontFamily || defaultTextStyle.fontFamily,
        fontSize: Math.max(8, Number(group.textStyle?.fontSize) || defaultTextStyle.fontSize),
        color: sanitizeColor(group.textStyle?.color, defaultTextStyle.color),
        bold: Boolean(group.textStyle?.bold),
        italic: Boolean(group.textStyle?.italic),
        align: ["left", "center", "right"].includes(group.textStyle?.align)
          ? group.textStyle.align
          : defaultTextStyle.align
      };
      normalized.shapeStyle = {
        fill: sanitizeColor(group.shapeStyle?.fill, "#ffffff"),
        stroke: sanitizeColor(group.shapeStyle?.stroke, "#0f766e"),
        strokeWidth: Math.max(1, Number(group.shapeStyle?.strokeWidth) || 2),
        radius: Math.max(0, Number(group.shapeStyle?.radius) || 12)
      };
      ensureGroupDefaults(normalized);
      normalizedGroups.push(normalized);
    });
    doc.groups = normalizedGroups;

    doc.meta = {
      version: "1.0",
      createdAt: doc.meta?.createdAt || new Date().toISOString(),
      app: "FlowChartTR"
    };

    normalizeZIndicesForDoc(doc);
  }

  function getNodeIdSet(doc) {
    return new Set(doc.nodes.map((node) => node.id));
  }

  function normalizeZIndicesForDoc(doc) {
    doc.nodes
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .forEach((node, index) => {
        node.zIndex = index + 1;
      });
  }

  function downloadTextFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function applyUiTheme(nextTheme, persist = true) {
    const safeTheme = normalizeTheme(nextTheme);
    state.ui.theme = safeTheme;
    document.body.dataset.theme = safeTheme;
    if (refs.btnTema) {
      refs.btnTema.dataset.active = safeTheme === "dark" ? "1" : "0";
      refs.btnTema.textContent = safeTheme === "dark" ? "Açık Mod" : "Koyu Mod";
    }
    if (persist) {
      try {
        window.localStorage.setItem("flowchart-theme", safeTheme);
      } catch (error) {
        // localStorage devre dışıysa tema yine de uygulanır.
      }
    }
  }

  async function waitForMathJaxReady(timeoutMs = 3500) {
    if (window.MathJax && typeof window.MathJax.tex2svg === "function") {
      mathJaxReady = true;
      return;
    }
    const startupPromise = window.MathJax?.startup?.promise;
    if (!startupPromise) {
      return;
    }
    await Promise.race([
      startupPromise
        .then(() => {
          mathJaxReady = Boolean(window.MathJax && typeof window.MathJax.tex2svg === "function");
          if (mathJaxReady) {
            mathCache.clear();
            Renderer.requestRender();
          }
        })
        .catch((error) => {
          console.warn("MathJax başlangıç hatası:", error);
        }),
      new Promise((resolve) => window.setTimeout(resolve, timeoutMs))
    ]);
  }

  function persistAutoSaveSnapshot(silent = false) {
    try {
      const xml = Serialization.toXml(state.doc);
      const payload = {
        savedAt: new Date().toISOString(),
        xml
      };
      window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(payload));
      state.autoSave.dirty = false;
      state.autoSave.lastSavedAt = payload.savedAt;
      if (!silent) {
        showToast("Otomatik kayıt yapıldı.", "info");
      }
      return true;
    } catch (error) {
      console.warn("Otomatik kayıt başarısız:", error);
      if (!silent) {
        showToast("Otomatik kayıt yapılamadı.", "error");
      }
      return false;
    }
  }

  function startAutoSaveLoop() {
    if (state.autoSave.timerId) {
      window.clearInterval(state.autoSave.timerId);
    }
    state.autoSave.timerId = window.setInterval(() => {
      if (state.autoSave.dirty) {
        persistAutoSaveSnapshot(false);
      } else {
        showToast("5 dakika geçti. XML veya PDF kaydetmeyi unutmayın.", "info");
      }
    }, AUTO_SAVE_INTERVAL_MS);
  }

  function tryRestoreAutoSave() {
    try {
      const raw = window.localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const payload = JSON.parse(raw);
      if (!payload || typeof payload.xml !== "string" || !payload.xml.trim()) {
        return;
      }
      const savedDate = payload.savedAt ? new Date(payload.savedAt) : null;
      const savedText = savedDate && !Number.isNaN(savedDate.getTime()) ? savedDate.toLocaleString() : "bilinmeyen zaman";
      const shouldRestore = window.confirm(
        `Otomatik kayıt bulundu (${savedText}). Geri yüklemek ister misiniz?`
      );
      if (!shouldRestore) {
        return;
      }
      const restoredDoc = Serialization.fromXml(payload.xml);
      state.doc = restoredDoc;
      clearSelection();
      state.pasteOffset = 0;
      History.clear();
      state.autoSave.dirty = false;
      state.autoSave.lastSavedAt = payload.savedAt || null;
      showToast("Otomatik kayıt geri yüklendi.", "success");
    } catch (error) {
      console.warn("Otomatik kayıt geri yükleme hatası:", error);
    }
  }

  function computeDocumentBounds() {
    const visibleNodes = state.doc.nodes.filter((node) => isNodeVisible(node.id));
    const collapsedFrames = (state.doc.groups || [])
      .filter((group) => group.collapsed)
      .map((group) => computeCollapsedGroupFrame(group));

    if (!visibleNodes.length && !collapsedFrames.length) {
      return {
        minX: -100,
        minY: -100,
        maxX: 900,
        maxY: 600
      };
    }

    const minXValues = [
      ...visibleNodes.map((node) => node.x),
      ...collapsedFrames.map((frame) => frame.x)
    ];
    const minYValues = [
      ...visibleNodes.map((node) => node.y),
      ...collapsedFrames.map((frame) => frame.y)
    ];
    const maxXValues = [
      ...visibleNodes.map((node) => node.x + node.w),
      ...collapsedFrames.map((frame) => frame.x + frame.w)
    ];
    const maxYValues = [
      ...visibleNodes.map((node) => node.y + node.h),
      ...collapsedFrames.map((frame) => frame.y + frame.h)
    ];
    const minX = Math.min(...minXValues);
    const minY = Math.min(...minYValues);
    const maxX = Math.max(...maxXValues);
    const maxY = Math.max(...maxYValues);
    const padding = 40;

    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  }

  async function exportPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast("PDF kütüphanesi yüklenemedi.", "error");
      return;
    }

    try {
      await waitForMathJaxReady();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: state.ui.pdfOrientation,
        unit: "pt",
        format: "a4"
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 22;
      const bounds = computeDocumentBounds();
      const exportSvg = Renderer.createStaticSvg(bounds);
      const exportScale = Math.min(
        (pageWidth - margin * 2) / (bounds.maxX - bounds.minX),
        (pageHeight - margin * 2) / (bounds.maxY - bounds.minY)
      );
      const drawWidth = (bounds.maxX - bounds.minX) * exportScale;
      const drawHeight = (bounds.maxY - bounds.minY) * exportScale;

      let rendered = false;
      if (typeof pdf.svg === "function") {
        try {
          await pdf.svg(exportSvg, {
            x: margin,
            y: margin,
            width: drawWidth,
            height: drawHeight
          });
          rendered = true;
        } catch (pdfSvgError) {
          console.warn("pdf.svg başarısız oldu, svg2pdf deneniyor:", pdfSvgError);
        }
      }
      if (!rendered && window.svg2pdf) {
        try {
          await window.svg2pdf(exportSvg, pdf, {
            xOffset: margin,
            yOffset: margin,
            scale: exportScale
          });
          rendered = true;
        } catch (svg2PdfError) {
          console.warn("svg2pdf başarısız oldu, raster yöntem deneniyor:", svg2PdfError);
        }
      }
      if (!rendered) {
        await exportPdfFallback(pdf, exportSvg, margin, pageWidth, pageHeight);
      }

      pdf.save("flowchart.pdf");
      showToast("PDF dışa aktarıldı.", "success");
    } catch (error) {
      console.error(error);
      showToast(`PDF dışa aktarılamadı: ${error.message}`, "error");
    }
  }

  async function exportPdfFallback(pdf, svgElement, margin, pageWidth, pageHeight) {
    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(svgElement);
    const sourceWidth = Number(svgElement.getAttribute("width")) || 1200;
    const sourceHeight = Number(svgElement.getAttribute("height")) || 800;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    const drawWidth = sourceWidth * ratio;
    const drawHeight = sourceHeight * ratio;
    const targetDpi = 600;
    const qualityScale = clamp(targetDpi / 72, 5, 14);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(drawWidth * qualityScale));
    canvas.height = Math.max(1, Math.round(drawHeight * qualityScale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas bağlamı oluşturulamadı.");
    }
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) {
      ctx.imageSmoothingQuality = "high";
    }
    const renderScaleX = canvas.width / sourceWidth;
    const renderScaleY = canvas.height / sourceHeight;
    ctx.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sourceWidth, sourceHeight);

    if (window.canvg && window.canvg.Canvg) {
      try {
        const v = await window.canvg.Canvg.fromString(ctx, svgText, {
          ignoreAnimation: true,
          ignoreMouse: true,
          ignoreDimensions: true
        });
        await v.render();
      } catch (canvgError) {
        console.warn("Canvg ile rasterize başarısız, standart yöntem deneniyor:", canvgError);
        const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("SVG görseli oluşturulamadı."));
          img.src = encoded;
        });
        ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
      }
    } else {
      const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("SVG görseli oluşturulamadı."));
        img.src = encoded;
      });
      ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
    }

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      margin,
      margin,
      drawWidth,
      drawHeight,
      undefined,
      "NONE"
    );
  }

  // ===== Commands =====
  // Komutlar: toolbar ve klavye eylemlerinin model mutasyonlarını içerir.
  const Commands = {
    addNodeAtCenter(type) {
      const canvasBox = refs.canvas.getBoundingClientRect();
      const centerWorld = getWorldPointFromEvent({
        clientX: canvasBox.left + canvasBox.width / 2,
        clientY: canvasBox.top + canvasBox.height / 2
      });

      withHistory(() => {
        const node = createNode(type, 0, 0);
        node.x = snap(centerWorld.x - node.w / 2);
        node.y = snap(centerWorld.y - node.h / 2);
        node.zIndex = getMaxZIndex() + 1;
        state.doc.nodes.push(node);
        selectSingleNode(node.id);
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
      showToast(`${getTypeLabel(type)} bloğu eklendi.`, "success");
    },

    deleteSelection() {
      if (!state.selectedNodeIds.size && !state.selectedEdgeId && !state.selectedGroupId) {
        return;
      }

      withHistory(() => {
        if (state.selectedNodeIds.size) {
          const ids = new Set(state.selectedNodeIds);
          state.doc.nodes = state.doc.nodes.filter((node) => !ids.has(node.id));
          state.doc.edges = state.doc.edges.filter(
            (edge) => !ids.has(edge.from.nodeId) && !ids.has(edge.to.nodeId)
          );
          if (Array.isArray(state.doc.groups)) {
            state.doc.groups = state.doc.groups
              .map((group) => ({
                ...group,
                nodeIds: (group.nodeIds || []).filter((nodeId) => !ids.has(nodeId))
              }))
              .filter((group) => (group.nodeIds || []).length >= 2);
          }
        }

        if (state.selectedEdgeId) {
          state.doc.edges = state.doc.edges.filter((edge) => edge.id !== state.selectedEdgeId);
        }

        if (state.selectedGroupId && Array.isArray(state.doc.groups)) {
          state.doc.groups = state.doc.groups.filter((group) => group.id !== state.selectedGroupId);
        }

        clearSelection();
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
    },

    copySelection() {
      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      if (!selectedNodes.length) {
        showToast("Kopyalamak için en az bir blok seçin.", "error");
        return;
      }

      const selectedIds = new Set(selectedNodes.map((node) => node.id));
      const selectedEdges = state.doc.edges.filter(
        (edge) => selectedIds.has(edge.from.nodeId) && selectedIds.has(edge.to.nodeId)
      );

      state.clipboard = {
        nodes: cloneDeep(selectedNodes),
        edges: cloneDeep(selectedEdges)
      };
      showToast("Seçim panoya kopyalandı.", "success");
    },

    pasteClipboard() {
      if (!state.clipboard || !state.clipboard.nodes.length) {
        showToast("Pano boş.", "error");
        return;
      }

      withHistory(() => {
        state.pasteOffset += 20;
        const idMap = new Map();

        const maxZ = getMaxZIndex();
        const pastedNodes = state.clipboard.nodes.map((sourceNode, index) => {
          const clonedNode = cloneDeep(sourceNode);
          clonedNode.id = generateId("n");
          clonedNode.x = snap(clonedNode.x + state.pasteOffset);
          clonedNode.y = snap(clonedNode.y + state.pasteOffset);
          clonedNode.zIndex = maxZ + index + 1;
          idMap.set(sourceNode.id, clonedNode.id);
          return clonedNode;
        });

        const pastedEdges = state.clipboard.edges
          .map((sourceEdge) => {
            const fromId = idMap.get(sourceEdge.from.nodeId);
            const toId = idMap.get(sourceEdge.to.nodeId);
            if (!fromId || !toId) {
              return null;
            }
            const clonedEdge = cloneDeep(sourceEdge);
            clonedEdge.id = generateId("e");
            clonedEdge.from.nodeId = fromId;
            clonedEdge.to.nodeId = toId;
            return clonedEdge;
          })
          .filter(Boolean);

        state.doc.nodes.push(...pastedNodes);
        state.doc.edges.push(...pastedEdges);
        state.selectedNodeIds = new Set(pastedNodes.map((node) => node.id));
        state.selectedEdgeId = null;
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
      showToast("Yapıştırıldı.", "success");
    },

    duplicateSelection() {
      if (!state.selectedNodeIds.size) {
        showToast("Çoğaltmak için en az bir blok seçin.", "error");
        return;
      }
      Commands.copySelection();
      if (!state.clipboard || !state.clipboard.nodes.length) {
        return;
      }
      Commands.pasteClipboard();
    },

    groupSelection() {
      const selectedIds = [...state.selectedNodeIds];
      if (selectedIds.length < 2) {
        showToast("Gruplamak için en az iki blok seçin.", "error");
        return;
      }
      const alreadyGrouped = selectedIds.some((nodeId) => getGroupForNode(nodeId));
      if (alreadyGrouped) {
        showToast("Seçimde zaten bir gruba ait blok var.", "error");
        return;
      }

      withHistory(() => {
        const group = createGroup(selectedIds);
        if (!Array.isArray(state.doc.groups)) {
          state.doc.groups = [];
        }
        state.doc.groups.push(group);
        state.selectedNodeIds.clear();
        state.selectedEdgeId = null;
        state.selectedGroupId = group.id;
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
      showToast("Bloklar gruplandı.", "success");
    },

    toggleGroup(groupId) {
      const group = getGroupById(groupId);
      if (!group) {
        return;
      }

      withHistory(() => {
        ensureGroupDefaults(group);
        if (group.collapsed) {
          group.collapsed = false;
        } else {
          const expanded = getGroupExpandedFrame(group);
          const estimated = estimateCollapsedGroupSize(group);
          const existing = group.frame;
          const keepExistingSize =
            Boolean(existing) &&
            Number.isFinite(existing.w) &&
            Number.isFinite(existing.h) &&
            existing.w <= estimated.w * 2 &&
            existing.h <= estimated.h * 2;
          group.frame = {
            x: snapAlways(existing?.x ?? expanded?.x ?? 0),
            y: snapAlways(existing?.y ?? expanded?.y ?? 0),
            w: keepExistingSize
              ? Math.max(GROUP_COLLAPSED_MIN_W, snapAlways(existing.w))
              : estimated.w,
            h: keepExistingSize
              ? Math.max(GROUP_COLLAPSED_MIN_H, snapAlways(existing.h))
              : estimated.h
          };
          group.collapsed = true;
          clearSelection();
        }
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
    },

    addNodeFromQuickPalette(type) {
      const { nodeId, direction } = state.ui.quickAdd;
      if (!nodeId || !direction) {
        closeQuickPalette();
        return;
      }
      const sourceNode = getNodeById(nodeId);
      if (!sourceNode) {
        closeQuickPalette();
        return;
      }

      withHistory(() => {
        const newNode = createNode(type, 0, 0);
        if (direction === "left") {
          newNode.x = snapAlways(sourceNode.x - newNode.w - QUICK_ADD_OFFSET);
          newNode.y = snapAlways(sourceNode.y + (sourceNode.h - newNode.h) / 2);
        } else if (direction === "top") {
          newNode.x = snapAlways(sourceNode.x + (sourceNode.w - newNode.w) / 2);
          newNode.y = snapAlways(sourceNode.y - newNode.h - QUICK_ADD_OFFSET);
        } else if (direction === "bottom") {
          newNode.x = snapAlways(sourceNode.x + (sourceNode.w - newNode.w) / 2);
          newNode.y = snapAlways(sourceNode.y + sourceNode.h + QUICK_ADD_OFFSET);
        } else {
          newNode.x = snapAlways(sourceNode.x + sourceNode.w + QUICK_ADD_OFFSET);
          newNode.y = snapAlways(sourceNode.y + (sourceNode.h - newNode.h) / 2);
        }

        newNode.zIndex = getMaxZIndex() + 1;
        state.doc.nodes.push(newNode);
        const anchors = getDirectionAnchors(direction);
        const edge = createEdge(sourceNode.id, anchors.from, newNode.id, anchors.to);
        edge.route.bend = null;
        state.doc.edges.push(edge);
        selectSingleNode(newNode.id);
      });

      closeQuickPalette();
      Renderer.requestRender();
      UI.updatePropertiesPanel();
      showToast(`${getTypeLabel(type)} eklendi ve bağlandı.`, "success");
    },

    alignSelected(mode) {
      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      if (selectedNodes.length < 2) {
        showToast("Hizalama için en az iki blok seçin.", "error");
        return;
      }

      withHistory(() => {
        if (mode === "left") {
          const left = Math.min(...selectedNodes.map((node) => node.x));
          selectedNodes.forEach((node) => {
            node.x = left;
          });
        } else if (mode === "center") {
          const center =
            selectedNodes.reduce((sum, node) => sum + node.x + node.w / 2, 0) / selectedNodes.length;
          selectedNodes.forEach((node) => {
            node.x = center - node.w / 2;
          });
        } else if (mode === "right") {
          const right = Math.max(...selectedNodes.map((node) => node.x + node.w));
          selectedNodes.forEach((node) => {
            node.x = right - node.w;
          });
        } else if (mode === "top") {
          const top = Math.min(...selectedNodes.map((node) => node.y));
          selectedNodes.forEach((node) => {
            node.y = top;
          });
        } else if (mode === "middle") {
          const middle =
            selectedNodes.reduce((sum, node) => sum + node.y + node.h / 2, 0) / selectedNodes.length;
          selectedNodes.forEach((node) => {
            node.y = middle - node.h / 2;
          });
        } else if (mode === "bottom") {
          const bottom = Math.max(...selectedNodes.map((node) => node.y + node.h));
          selectedNodes.forEach((node) => {
            node.y = bottom - node.h;
          });
        }
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
    },

    distributeSelected(axis) {
      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      if (selectedNodes.length < 3) {
        showToast("Dağıtma için en az üç blok seçin.", "error");
        return;
      }

      withHistory(() => {
        if (axis === "horizontal") {
          const sorted = [...selectedNodes].sort((a, b) => a.x - b.x);
          const left = sorted[0].x;
          const right = sorted[sorted.length - 1].x + sorted[sorted.length - 1].w;
          const totalWidth = sorted.reduce((sum, node) => sum + node.w, 0);
          const gap = (right - left - totalWidth) / (sorted.length - 1);

          let cursor = left;
          sorted.forEach((node) => {
            node.x = cursor;
            cursor += node.w + gap;
          });
        } else {
          const sorted = [...selectedNodes].sort((a, b) => a.y - b.y);
          const top = sorted[0].y;
          const bottom = sorted[sorted.length - 1].y + sorted[sorted.length - 1].h;
          const totalHeight = sorted.reduce((sum, node) => sum + node.h, 0);
          const gap = (bottom - top - totalHeight) / (sorted.length - 1);

          let cursor = top;
          sorted.forEach((node) => {
            node.y = cursor;
            cursor += node.h + gap;
          });
        }
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
    },

    bringSelectionToFront() {
      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      if (!selectedNodes.length) {
        return;
      }

      withHistory(() => {
        let z = getMaxZIndex();
        selectedNodes
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .forEach((node) => {
            z += 1;
            node.zIndex = z;
          });
        normalizeZIndices();
      });

      Renderer.requestRender();
    },

    sendSelectionToBack() {
      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      if (!selectedNodes.length) {
        return;
      }

      withHistory(() => {
        let z = Math.min(...state.doc.nodes.map((node) => node.zIndex || 0)) - 1;
        selectedNodes
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .forEach((node) => {
            node.zIndex = z;
            z -= 1;
          });
        normalizeZIndices();
      });

      Renderer.requestRender();
    },

    applyThemePreset() {
      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      const targets = selectedNodes.length ? selectedNodes : state.doc.nodes;
      if (!targets.length) {
        showToast("Tema uygulamak için blok bulunamadı.", "error");
        return;
      }

      withHistory(() => {
        const preset = THEME_PRESETS[state.ui.themeIndex % THEME_PRESETS.length];
        targets.forEach((node, index) => {
          node.shapeStyle.fill = preset.fills[index % preset.fills.length];
          node.shapeStyle.stroke = preset.stroke;
          node.textStyle.color = preset.text;
        });
        state.doc.edges.forEach((edge) => {
          edge.style.stroke = preset.edge;
        });
        state.ui.themeIndex = (state.ui.themeIndex + 1) % THEME_PRESETS.length;
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
      showToast("Tema uygulandı.", "success");
    },

    autoArrangeFlow() {
      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      const targets = selectedNodes.length >= 2 ? selectedNodes : state.doc.nodes;
      if (targets.length < 2) {
        showToast("Akış düzeni için en az iki blok gerekli.", "error");
        return;
      }

      withHistory(() => {
        const sorted = [...targets].sort((a, b) => a.x - b.x || a.y - b.y);
        const baseX = Math.min(...sorted.map((node) => node.x));
        const centerY = sorted.reduce((sum, node) => sum + node.y + node.h / 2, 0) / sorted.length;
        let cursor = baseX;

        sorted.forEach((node, index) => {
          node.x = snap(cursor);
          node.y = snap(centerY - node.h / 2 + (index % 2 === 0 ? 0 : 12));
          cursor += node.w + 70;
        });
      });

      Renderer.requestRender();
      UI.updatePropertiesPanel();
      showToast("Akış otomatik hizalandı.", "success");
    },

    addStickyNote() {
      Commands.addNodeAtCenter("not");
    }
  };

  // ===== UI =====
  // Sağ panel ve toolbar durumu.
  const UI = {
    updateToolbarState() {
      refs.btnGeriAl.disabled = state.history.undo.length === 0;
      refs.btnYinele.disabled = state.history.redo.length === 0;
      refs.btnKopyala.disabled = state.selectedNodeIds.size === 0;
      refs.btnSil.disabled =
        state.selectedNodeIds.size === 0 && !state.selectedEdgeId && !state.selectedGroupId;
      if (refs.btnGrupla) {
        refs.btnGrupla.hidden = state.selectedNodeIds.size < 2;
      }
      refs.btnIzgara.dataset.active = state.ui.showGrid ? "1" : "0";
      refs.btnSnap.dataset.active = state.ui.snapToGrid ? "1" : "0";
      refs.pdfYon.value = state.ui.pdfOrientation;
      if (refs.btnTema) {
        refs.btnTema.dataset.active = state.ui.theme === "dark" ? "1" : "0";
        refs.btnTema.textContent = state.ui.theme === "dark" ? "Açık Mod" : "Koyu Mod";
      }
      if (refs.zoomSeviye) {
        refs.zoomSeviye.textContent = `%${Math.round(state.ui.scale * 100)}`;
      }
    },

    updatePropertiesPanel() {
      state.panelSync = true;

      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      const selectedEdge = state.selectedEdgeId ? getEdgeById(state.selectedEdgeId) : null;
      const selectedGroup = state.selectedGroupId ? getGroupById(state.selectedGroupId) : null;

      refs.blokOzellikleri.hidden = true;
      refs.baglantiOzellikleri.hidden = true;
      if (refs.propEdgeCornerRadius) {
        refs.propEdgeCornerRadius.disabled = true;
      }

      if (selectedNodes.length === 1) {
        const node = selectedNodes[0];
        refs.secimBilgi.textContent = `Seçili blok: ${node.id} (${getTypeLabel(node.type)})`;
        refs.blokOzellikleri.hidden = false;

        refs.propMetin.value = node.text;
        refs.propFontFamily.value = node.textStyle.fontFamily;
        refs.propFontSize.value = node.textStyle.fontSize;
        refs.propTextColor.value = node.textStyle.color;
        refs.propTextAlign.value = node.textStyle.align;
        refs.propBold.checked = Boolean(node.textStyle.bold);
        refs.propItalic.checked = Boolean(node.textStyle.italic);
        refs.propFill.value = node.shapeStyle.fill;
        refs.propStroke.value = node.shapeStyle.stroke;
        refs.propStrokeWidth.value = node.shapeStyle.strokeWidth;
        refs.propRadius.value = node.shapeStyle.radius;
        refs.propW.value = Math.round(node.w);
        refs.propH.value = Math.round(node.h);
      } else if (selectedGroup) {
        ensureGroupDefaults(selectedGroup);
        const frame = computeCollapsedGroupFrame(selectedGroup);
        refs.secimBilgi.textContent = `Seçili grup: ${selectedGroup.id} (${selectedGroup.nodeIds.length} blok)`;
        refs.blokOzellikleri.hidden = false;

        refs.propMetin.value = selectedGroup.text || "";
        refs.propFontFamily.value = selectedGroup.textStyle.fontFamily;
        refs.propFontSize.value = selectedGroup.textStyle.fontSize;
        refs.propTextColor.value = selectedGroup.textStyle.color;
        refs.propTextAlign.value = selectedGroup.textStyle.align;
        refs.propBold.checked = Boolean(selectedGroup.textStyle.bold);
        refs.propItalic.checked = Boolean(selectedGroup.textStyle.italic);
        refs.propFill.value = selectedGroup.shapeStyle.fill;
        refs.propStroke.value = selectedGroup.shapeStyle.stroke;
        refs.propStrokeWidth.value = selectedGroup.shapeStyle.strokeWidth;
        refs.propRadius.value = selectedGroup.shapeStyle.radius;
        refs.propW.value = Math.round(frame.w);
        refs.propH.value = Math.round(frame.h);
      } else if (selectedEdge) {
        refs.secimBilgi.textContent = `Seçili bağlantı: ${selectedEdge.id}`;
        refs.baglantiOzellikleri.hidden = false;
        const route = normalizeEdgeRoute(selectedEdge.route);

        refs.propEdgeStroke.value = selectedEdge.style.stroke;
        refs.propEdgeStrokeWidth.value = selectedEdge.style.strokeWidth;
        refs.propEdgeDashed.checked = Boolean(selectedEdge.style.dashed);
        refs.propEdgeArrow.checked = Boolean(selectedEdge.style.arrow);
        if (refs.propEdgeType) {
          refs.propEdgeType.value = route.type;
        }
        if (refs.propEdgeCornerRadius) {
          refs.propEdgeCornerRadius.value = route.cornerRadius;
          refs.propEdgeCornerRadius.disabled = route.type !== "orthogonal";
        }
        refs.propEdgeLabel.value = selectedEdge.label.text;
        refs.propEdgeLabelSize.value = selectedEdge.label.fontSize;
        refs.propEdgeLabelColor.value = selectedEdge.label.color;
      } else if (selectedNodes.length > 1) {
        refs.secimBilgi.textContent = `${selectedNodes.length} blok seçili.`;
      } else {
        refs.secimBilgi.textContent = "Bir öğe seçin.";
      }

      state.panelSync = false;
      UI.updateToolbarState();
    }
  };

  function mutateSingleNode(mutator) {
    if (state.panelSync) {
      return;
    }
    if (state.selectedNodeIds.size === 1) {
      const nodeId = [...state.selectedNodeIds][0];
      const node = getNodeById(nodeId);
      if (!node) {
        return;
      }

      withHistory(() => {
        mutator(node);
      });

      Renderer.requestRender();
      return;
    }

    if (!state.selectedGroupId || state.selectedEdgeId || state.selectedNodeIds.size) {
      return;
    }

    const group = getGroupById(state.selectedGroupId);
    if (!group) {
      return;
    }

    withHistory(() => {
      ensureGroupDefaults(group);
      const frame = computeCollapsedGroupFrame(group);
      const draft = {
        type: group.type,
        text: group.text,
        textStyle: cloneDeep(group.textStyle),
        shapeStyle: cloneDeep(group.shapeStyle),
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h
      };

      mutator(draft);

      group.type = isSupportedNodeType(draft.type) ? draft.type : group.type;
      group.text = typeof draft.text === "string" ? draft.text : group.text;
      group.textStyle = {
        fontFamily: draft.textStyle?.fontFamily || defaultTextStyle.fontFamily,
        fontSize: clamp(Number(draft.textStyle?.fontSize) || defaultTextStyle.fontSize, 8, 72),
        color: sanitizeColor(draft.textStyle?.color, defaultTextStyle.color),
        bold: Boolean(draft.textStyle?.bold),
        italic: Boolean(draft.textStyle?.italic),
        align: ["left", "center", "right"].includes(draft.textStyle?.align)
          ? draft.textStyle.align
          : defaultTextStyle.align
      };
      group.shapeStyle = {
        fill: sanitizeColor(draft.shapeStyle?.fill, group.shapeStyle.fill),
        stroke: sanitizeColor(draft.shapeStyle?.stroke, group.shapeStyle.stroke),
        strokeWidth: clamp(Number(draft.shapeStyle?.strokeWidth) || group.shapeStyle.strokeWidth, 1, 20),
        radius: clamp(Number(draft.shapeStyle?.radius) || group.shapeStyle.radius, 0, 80)
      };

      const draftX = Number(draft.x);
      const draftY = Number(draft.y);
      const draftW = Number(draft.w);
      const draftH = Number(draft.h);
      group.frame = {
        x: snapAlways(Number.isFinite(draftX) ? draftX : frame.x),
        y: snapAlways(Number.isFinite(draftY) ? draftY : frame.y),
        w: Math.max(GROUP_COLLAPSED_MIN_W, snapAlways(Number.isFinite(draftW) ? draftW : frame.w)),
        h: Math.max(GROUP_COLLAPSED_MIN_H, snapAlways(Number.isFinite(draftH) ? draftH : frame.h))
      };
    });

    Renderer.requestRender();
  }

  function mutateSelectedEdge(mutator) {
    if (state.panelSync || !state.selectedEdgeId) {
      return;
    }
    const edge = getEdgeById(state.selectedEdgeId);
    if (!edge) {
      return;
    }

    withHistory(() => {
      mutator(edge);
    });

    Renderer.requestRender();
  }

  // ===== Interaction =====
  // Pointer etkileşimleri: seçme, sürükleme, boyutlandırma, bağlama, pan.
  function zoomAtClient(clientX, clientY, factor) {
    const local = getCanvasPoint(clientX, clientY);
    const worldX = (local.x - state.ui.panX) / state.ui.scale;
    const worldY = (local.y - state.ui.panY) / state.ui.scale;
    const nextScale = clamp(state.ui.scale * factor, 0.2, 4);

    state.ui.scale = nextScale;
    state.ui.panX = local.x - worldX * nextScale;
    state.ui.panY = local.y - worldY * nextScale;

    Renderer.requestRender();
    UI.updateToolbarState();
  }

  function zoomFromCenter(factor) {
    const box = refs.canvas.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    zoomAtClient(cx, cy, factor);
  }

  function updateMarqueeSelection() {
    if (!state.interaction.startWorld || !state.interaction.currentWorld) {
      return;
    }

    const marqueeRect = {
      left: Math.min(state.interaction.startWorld.x, state.interaction.currentWorld.x),
      top: Math.min(state.interaction.startWorld.y, state.interaction.currentWorld.y),
      right: Math.max(state.interaction.startWorld.x, state.interaction.currentWorld.x),
      bottom: Math.max(state.interaction.startWorld.y, state.interaction.currentWorld.y)
    };

    const hitNodeIds = state.doc.nodes
      .filter((node) => isNodeVisible(node.id) && rectsIntersect(marqueeRect, getNodeBounds(node)))
      .map((node) => node.id);

    if (!state.interaction.marqueeAdditive) {
      state.selectedNodeIds = new Set(hitNodeIds);
    } else {
      hitNodeIds.forEach((nodeId) => state.selectedNodeIds.add(nodeId));
    }
    state.selectedEdgeId = null;
    state.selectedGroupId = null;
  }

  function startDrag(event, nodeId) {
    if (!state.selectedNodeIds.has(nodeId)) {
      selectSingleNode(nodeId);
      UI.updatePropertiesPanel();
    }

    History.begin();
    state.interaction.mode = "drag";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.moved = false;
    state.interaction.dragItems = state.doc.nodes
      .filter((node) => state.selectedNodeIds.has(node.id))
      .map((node) => ({ id: node.id, x: node.x, y: node.y }));
  }

  function startGroupDrag(event, groupId) {
    const group = getGroupById(groupId);
    if (!group) {
      return;
    }

    state.selectedNodeIds.clear();
    state.selectedEdgeId = null;
    state.selectedGroupId = groupId;
    closeQuickPalette();
    UI.updatePropertiesPanel();

    History.begin();
    state.interaction.mode = "group-drag";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.moved = false;
    const groupNodeIds = new Set(group.nodeIds || []);
    state.interaction.dragItems = state.doc.nodes
      .filter((node) => groupNodeIds.has(node.id))
      .map((node) => ({ id: node.id, x: node.x, y: node.y }));
    const frame = computeCollapsedGroupFrame(group);
    state.interaction.groupDrag = {
      groupId,
      startFrame: {
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h
      }
    };
  }

  function startResize(event, nodeId, handle) {
    if (!state.selectedNodeIds.has(nodeId) || state.selectedNodeIds.size !== 1) {
      selectSingleNode(nodeId);
      UI.updatePropertiesPanel();
    }

    const node = getNodeById(nodeId);
    if (!node) {
      return;
    }

    History.begin();
    state.interaction.mode = "resize";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.moved = false;
    state.interaction.resizeItem = {
      nodeId,
      handle,
      initial: {
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h
      }
    };
  }

  function startEdgeHandleDrag(event, edgeId, handleKind, axis) {
    const edge = getEdgeById(edgeId);
    if (!edge) {
      return;
    }
    if (state.selectedEdgeId !== edgeId) {
      selectSingleEdge(edgeId);
      UI.updatePropertiesPanel();
    }

    History.begin();
    state.interaction.mode = "edge-handle";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.moved = false;
    state.interaction.edgeHandle = {
      edgeId,
      handleKind,
      axis
    };
    document.body.classList.add("dragging-edge-handle");
  }

  function startEdgeEndpointDrag(event, edgeId, endKey) {
    const edge = getEdgeById(edgeId);
    if (!edge || (endKey !== "from" && endKey !== "to")) {
      return;
    }
    if (state.selectedEdgeId !== edgeId) {
      selectSingleEdge(edgeId);
      UI.updatePropertiesPanel();
    }

    History.begin();
    state.interaction.mode = "edge-endpoint";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.moved = false;
    state.interaction.edgeEndpoint = {
      edgeId,
      endKey
    };
  }

  function startEdgeLabelDrag(event, edgeId) {
    const edge = getEdgeById(edgeId);
    if (!edge) {
      return;
    }
    if (state.selectedEdgeId !== edgeId) {
      selectSingleEdge(edgeId);
      UI.updatePropertiesPanel();
    }

    History.begin();
    state.interaction.mode = "edge-label";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.moved = false;
    state.interaction.edgeLabel = {
      edgeId,
      startOffsetX: Number.isFinite(Number(edge.label?.offsetX)) ? Number(edge.label.offsetX) : 0,
      startOffsetY: Number.isFinite(Number(edge.label?.offsetY)) ? Number(edge.label.offsetY) : 0
    };
  }

  function startConnect(event, nodeId, anchor) {
    const node = getNodeById(nodeId);
    if (!node) {
      return;
    }

    History.begin();
    state.interaction.mode = "connect";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.connectFrom = {
      nodeId,
      anchor
    };
    state.interaction.moved = true;
  }

  function startPan(event) {
    state.interaction.mode = "pan";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startClient = { x: event.clientX, y: event.clientY };
    state.interaction.startPan = { x: state.ui.panX, y: state.ui.panY };
    document.body.style.cursor = "grabbing";
  }

  function startMarquee(event) {
    state.interaction.mode = "marquee";
    state.interaction.pointerId = event.pointerId;
    state.interaction.startWorld = getWorldPointFromEvent(event);
    state.interaction.currentWorld = state.interaction.startWorld;
    state.interaction.marqueeAdditive = event.shiftKey;
    state.interaction.moved = false;

    if (!event.shiftKey) {
      clearSelection();
      UI.updatePropertiesPanel();
    }

    Renderer.requestRender();
  }

  function resetInteraction() {
    state.interaction.mode = null;
    state.interaction.pointerId = null;
    state.interaction.moved = false;
    state.interaction.startWorld = null;
    state.interaction.currentWorld = null;
    state.interaction.startClient = null;
    state.interaction.startPan = null;
    state.interaction.dragItems = [];
    state.interaction.groupDrag = null;
    state.interaction.resizeItem = null;
    state.interaction.edgeHandle = null;
    state.interaction.edgeEndpoint = null;
    state.interaction.edgeLabel = null;
    state.interaction.connectFrom = null;
    state.interaction.marqueeAdditive = false;
    document.body.classList.remove("dragging-edge-handle");
    document.body.style.cursor = "default";
  }

  function onPointerDown(event) {
    const quickArrowEl = event.target.closest(".quick-add-arrow");
    const groupToggleEl = event.target.closest(".group-toggle");
    const groupItemEl = event.target.closest(".group-item");
    const edgeControlEl = event.target.closest(".edge-control-handle");
    const edgeEndpointEl = event.target.closest(".edge-endpoint-handle");
    const edgeLabelEl = event.target.closest(".edge-label[data-edge-label='1']");
    const handleEl = event.target.closest(".resize-handle");
    const anchorEl = event.target.closest(".anchor");
    const nodeEl = event.target.closest(".node");
    const edgeEl = event.target.closest(".edge");

    const isPanTrigger =
      event.button === 1 ||
      (state.keyboard.spacePressed &&
        event.button === 0 &&
        !quickArrowEl &&
        !groupToggleEl &&
        !groupItemEl &&
        !edgeControlEl &&
        !edgeEndpointEl &&
        !edgeLabelEl &&
        !handleEl &&
        !anchorEl &&
        !nodeEl &&
        !edgeEl);

    if (isPanTrigger) {
      event.preventDefault();
      startPan(event);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (quickArrowEl) {
      event.preventDefault();
      const nodeId = quickArrowEl.getAttribute("data-node-id");
      const direction = quickArrowEl.getAttribute("data-direction");
      if (nodeId && direction) {
        openQuickPalette(nodeId, direction, event.clientX, event.clientY);
      }
      return;
    }

    if (groupToggleEl) {
      event.preventDefault();
      const groupId = groupToggleEl.getAttribute("data-group-id");
      if (groupId) {
        Commands.toggleGroup(groupId);
      }
      return;
    }

    if (groupItemEl) {
      const groupId = groupItemEl.getAttribute("data-group-id");
      if (!groupId || !getGroupById(groupId)) {
        return;
      }
      event.preventDefault();
      startGroupDrag(event, groupId);
      Renderer.requestRender();
      return;
    }

    if (edgeControlEl) {
      event.preventDefault();
      startEdgeHandleDrag(
        event,
        edgeControlEl.getAttribute("data-edge-id"),
        edgeControlEl.getAttribute("data-handle-kind") || "orth-bend",
        edgeControlEl.getAttribute("data-axis") || "xy"
      );
      Renderer.requestRender();
      return;
    }

    if (edgeEndpointEl) {
      event.preventDefault();
      startEdgeEndpointDrag(
        event,
        edgeEndpointEl.getAttribute("data-edge-id"),
        edgeEndpointEl.getAttribute("data-end")
      );
      Renderer.requestRender();
      return;
    }

    if (edgeLabelEl) {
      event.preventDefault();
      startEdgeLabelDrag(event, edgeLabelEl.getAttribute("data-edge-id"));
      Renderer.requestRender();
      return;
    }

    if (handleEl) {
      event.preventDefault();
      startResize(
        event,
        handleEl.getAttribute("data-node-id"),
        handleEl.getAttribute("data-handle") || "se"
      );
      Renderer.requestRender();
      return;
    }

    if (anchorEl) {
      event.preventDefault();
      startConnect(
        event,
        anchorEl.getAttribute("data-node-id"),
        normalizeAnchor(anchorEl.getAttribute("data-anchor") || "right")
      );
      Renderer.requestRender();
      return;
    }

    if (nodeEl) {
      const nodeId = nodeEl.getAttribute("data-node-id");
      if (!nodeId) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        toggleNodeSelection(nodeId);
        UI.updatePropertiesPanel();
        Renderer.requestRender();
        return;
      }

      startDrag(event, nodeId);
      Renderer.requestRender();
      return;
    }

    if (edgeEl) {
      const edgeId = edgeEl.getAttribute("data-edge-id");
      if (!edgeId) {
        return;
      }
      event.preventDefault();
      selectSingleEdge(edgeId);
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      return;
    }

    startMarquee(event);
  }

  function onPointerMove(event) {
    if (!state.interaction.mode) {
      return;
    }
    if (state.interaction.pointerId !== null && event.pointerId !== state.interaction.pointerId) {
      return;
    }

    if (state.interaction.mode === "pan") {
      const dx = event.clientX - state.interaction.startClient.x;
      const dy = event.clientY - state.interaction.startClient.y;
      state.ui.panX = state.interaction.startPan.x + dx;
      state.ui.panY = state.interaction.startPan.y + dy;
      Renderer.requestRender();
      return;
    }

    const world = getWorldPointFromEvent(event);
    state.interaction.currentWorld = world;

    if (state.interaction.mode === "drag") {
      const dx = world.x - state.interaction.startWorld.x;
      const dy = world.y - state.interaction.startWorld.y;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        state.interaction.moved = true;
      }

      state.interaction.dragItems.forEach((item) => {
        const node = getNodeById(item.id);
        if (!node) {
          return;
        }
        node.x = state.ui.snapToGrid ? snap(item.x + dx) : item.x + dx;
        node.y = state.ui.snapToGrid ? snap(item.y + dy) : item.y + dy;
      });

      Renderer.requestRender();
      return;
    }

    if (state.interaction.mode === "group-drag" && state.interaction.groupDrag) {
      const dx = world.x - state.interaction.startWorld.x;
      const dy = world.y - state.interaction.startWorld.y;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        state.interaction.moved = true;
      }

      state.interaction.dragItems.forEach((item) => {
        const node = getNodeById(item.id);
        if (!node) {
          return;
        }
        node.x = state.ui.snapToGrid ? snap(item.x + dx) : item.x + dx;
        node.y = state.ui.snapToGrid ? snap(item.y + dy) : item.y + dy;
      });

      const group = getGroupById(state.interaction.groupDrag.groupId);
      const startFrame = state.interaction.groupDrag.startFrame;
      if (group && startFrame) {
        const nextFrameX = state.ui.snapToGrid ? snap(startFrame.x + dx) : startFrame.x + dx;
        const nextFrameY = state.ui.snapToGrid ? snap(startFrame.y + dy) : startFrame.y + dy;
        group.frame = {
          x: nextFrameX,
          y: nextFrameY,
          w: startFrame.w,
          h: startFrame.h
        };
      }

      Renderer.requestRender();
      return;
    }

    if (state.interaction.mode === "resize" && state.interaction.resizeItem) {
      const resize = state.interaction.resizeItem;
      const node = getNodeById(resize.nodeId);
      if (!node) {
        return;
      }

      const start = state.interaction.startWorld;
      const dx = world.x - start.x;
      const dy = world.y - start.y;
      const handle = resize.handle;
      const initial = resize.initial;

      let nextX = initial.x;
      let nextY = initial.y;
      let nextW = initial.w;
      let nextH = initial.h;

      if (handle.includes("e")) {
        nextW = initial.w + dx;
      }
      if (handle.includes("s")) {
        nextH = initial.h + dy;
      }
      if (handle.includes("w")) {
        nextW = initial.w - dx;
        nextX = initial.x + dx;
      }
      if (handle.includes("n")) {
        nextH = initial.h - dy;
        nextY = initial.y + dy;
      }

      if (nextW < MIN_NODE_W) {
        if (handle.includes("w")) {
          nextX -= MIN_NODE_W - nextW;
        }
        nextW = MIN_NODE_W;
      }
      if (nextH < MIN_NODE_H) {
        if (handle.includes("n")) {
          nextY -= MIN_NODE_H - nextH;
        }
        nextH = MIN_NODE_H;
      }

      if (state.ui.snapToGrid) {
        nextX = snap(nextX);
        nextY = snap(nextY);
        nextW = Math.max(MIN_NODE_W, snap(nextW));
        nextH = Math.max(MIN_NODE_H, snap(nextH));
      }

      node.x = nextX;
      node.y = nextY;
      node.w = nextW;
      node.h = nextH;

      state.interaction.moved = true;
      Renderer.requestRender();
      return;
    }

    if (state.interaction.mode === "edge-handle" && state.interaction.edgeHandle) {
      const edge = getEdgeById(state.interaction.edgeHandle.edgeId);
      if (!edge) {
        return;
      }

      const route = normalizeEdgeRoute(edge.route);
      if (state.interaction.edgeHandle.handleKind === "curve-control") {
        route.type = "curved";
        route.controlX = snapAlways(world.x);
        route.controlY = snapAlways(world.y);
      } else {
        route.type = "orthogonal";
        route.bend =
          state.interaction.edgeHandle.axis === "y"
            ? snapAlways(world.y)
            : snapAlways(world.x);
      }

      edge.route = route;
      state.interaction.moved = true;
      Renderer.requestRender();
      return;
    }

    if (state.interaction.mode === "edge-endpoint" && state.interaction.edgeEndpoint) {
      const edge = getEdgeById(state.interaction.edgeEndpoint.edgeId);
      if (!edge) {
        return;
      }
      const snapped = {
        x: snapAlways(world.x),
        y: snapAlways(world.y)
      };
      const end = edge[state.interaction.edgeEndpoint.endKey];
      end.nodeId = null;
      end.point = snapped;
      state.interaction.moved = true;
      Renderer.requestRender();
      return;
    }

    if (state.interaction.mode === "edge-label" && state.interaction.edgeLabel) {
      const edge = getEdgeById(state.interaction.edgeLabel.edgeId);
      if (!edge) {
        return;
      }
      const dx = world.x - state.interaction.startWorld.x;
      const dy = world.y - state.interaction.startWorld.y;
      edge.label.offsetX = state.interaction.edgeLabel.startOffsetX + dx;
      edge.label.offsetY = state.interaction.edgeLabel.startOffsetY + dy;
      state.interaction.moved = true;
      Renderer.requestRender();
      return;
    }

    if (state.interaction.mode === "connect") {
      Renderer.requestRender();
      return;
    }

    if (state.interaction.mode === "marquee") {
      const dx = Math.abs(world.x - state.interaction.startWorld.x);
      const dy = Math.abs(world.y - state.interaction.startWorld.y);
      if (dx > 2 || dy > 2) {
        state.interaction.moved = true;
      }
      Renderer.requestRender();
    }
  }

  function resolveDropNodeAnchor(event) {
    const worldPoint = getWorldPointFromEvent(event);
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
    if (dropTarget) {
      const dropAnchor = dropTarget.closest(".anchor");
      if (dropAnchor) {
        const nodeId = dropAnchor.getAttribute("data-node-id");
        const anchor = normalizeAnchor(dropAnchor.getAttribute("data-anchor") || "right");
        if (nodeId && getNodeById(nodeId)) {
          return { nodeId, anchor };
        }
      }

      const dropNodeEl = dropTarget.closest(".node");
      if (dropNodeEl) {
        const nodeId = dropNodeEl.getAttribute("data-node-id");
        const node = nodeId ? getNodeById(nodeId) : null;
        if (node) {
          return {
            nodeId,
            anchor: getNearestAnchorForPoint(node, worldPoint)
          };
        }
      }
    }

    const tolerance = 12;
    const visibleNodes = [...state.doc.nodes]
      .filter((node) => isNodeVisible(node.id))
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    const hitNode = visibleNodes.find((node) =>
      isPointInsideRect(worldPoint, getNodeBounds(node), tolerance)
    );
    if (hitNode) {
      return {
        nodeId: hitNode.id,
        anchor: getNearestAnchorForPoint(hitNode, worldPoint)
      };
    }

    const collapsedGroups = (state.doc.groups || []).filter((group) => group.collapsed);
    for (let index = collapsedGroups.length - 1; index >= 0; index -= 1) {
      const group = collapsedGroups[index];
      const frame = computeCollapsedGroupFrame(group);
      const frameRect = {
        left: frame.x,
        right: frame.x + frame.w,
        top: frame.y,
        bottom: frame.y + frame.h
      };
      if (!isPointInsideRect(worldPoint, frameRect, tolerance)) {
        continue;
      }
      const anchor = getNearestAnchorForPoint(
        { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
        worldPoint
      );
      const representativeNodeId = getGroupRepresentativeNodeId(group, anchor);
      if (representativeNodeId) {
        return {
          nodeId: representativeNodeId,
          anchor
        };
      }
    }

    return null;
  }

  function onPointerUp(event) {
    if (!state.interaction.mode) {
      return;
    }
    if (state.interaction.pointerId !== null && event.pointerId !== state.interaction.pointerId) {
      return;
    }

    if (state.interaction.mode === "drag") {
      if (state.interaction.moved) {
        History.commit();
      } else {
        History.cancel();
      }
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "group-drag") {
      if (state.interaction.moved) {
        History.commit();
      } else {
        History.cancel();
      }
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "resize") {
      if (state.interaction.moved) {
        History.commit();
      } else {
        History.cancel();
      }
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "edge-handle") {
      if (state.interaction.moved) {
        History.commit();
      } else {
        History.cancel();
      }
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "edge-endpoint" && state.interaction.edgeEndpoint) {
      const edge = getEdgeById(state.interaction.edgeEndpoint.edgeId);
      if (edge) {
        const dropBinding = resolveDropNodeAnchor(event);
        if (dropBinding) {
          edge[state.interaction.edgeEndpoint.endKey].nodeId = dropBinding.nodeId;
          edge[state.interaction.edgeEndpoint.endKey].anchor = dropBinding.anchor;
          edge[state.interaction.edgeEndpoint.endKey].point = null;
        }
      }
      if (state.interaction.moved) {
        History.commit();
      } else {
        History.cancel();
      }
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "edge-label") {
      if (state.interaction.moved) {
        History.commit();
      } else {
        History.cancel();
      }
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "connect") {
      let created = false;
      const dropBinding = resolveDropNodeAnchor(event);
      if (dropBinding && state.interaction.connectFrom) {
        const from = state.interaction.connectFrom;
        const toNodeId = dropBinding.nodeId;
        const toAnchor = dropBinding.anchor;

        if (toNodeId && getNodeById(toNodeId)) {
          const edge = createEdge(from.nodeId, from.anchor, toNodeId, toAnchor);
          state.doc.edges.push(edge);
          selectSingleEdge(edge.id);
          created = true;
        }
      }

      if (created) {
        History.commit();
        showToast("Bağlantı oluşturuldu.", "success");
      } else {
        History.cancel();
      }
      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "marquee") {
      if (state.interaction.moved) {
        updateMarqueeSelection();
      } else if (!state.interaction.marqueeAdditive) {
        clearSelection();
      }

      UI.updatePropertiesPanel();
      Renderer.requestRender();
      resetInteraction();
      return;
    }

    if (state.interaction.mode === "pan") {
      Renderer.requestRender();
      resetInteraction();
    }
  }

  function bindToolbarEvents() {
    document.querySelectorAll(".shape-btn[data-add-shape]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.getAttribute("data-add-shape");
        Commands.addNodeAtCenter(type);
      });
    });

    refs.btnYeni.addEventListener("click", () => {
      const confirmed = window.confirm("Yeni diyagram oluşturulsun mu? Mevcut çizim temizlenecek.");
      if (!confirmed) {
        return;
      }
      state.doc = createEmptyDocument();
      clearSelection();
      state.pasteOffset = 0;
      History.clear();
      Renderer.render();
      UI.updatePropertiesPanel();
      showToast("Yeni diyagram oluşturuldu.", "success");
    });

    refs.btnAc.addEventListener("click", () => refs.xmlDosyaInput.click());

    refs.xmlDosyaInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const importedDoc = Serialization.fromXml(String(reader.result || ""));
          state.doc = importedDoc;
          clearSelection();
          state.pasteOffset = 0;
          History.clear();
          Renderer.render();
          UI.updatePropertiesPanel();
          showToast("XML başarıyla içe aktarıldı.", "success");
        } catch (error) {
          console.error(error);
          showToast(`XML okunamadı: ${error.message}`, "error");
        }
      };
      reader.onerror = () => {
        showToast("XML dosyası okunamadı.", "error");
      };

      reader.readAsText(file, "utf-8");
      event.target.value = "";
    });

    refs.btnKaydet.addEventListener("click", () => {
      try {
        const xml = Serialization.toXml(state.doc);
        downloadTextFile(xml, "flowchart.xml", "application/xml;charset=utf-8");
        state.autoSave.dirty = false;
        persistAutoSaveSnapshot(true);
        showToast("XML dosyası indirildi.", "success");
      } catch (error) {
        showToast(`XML kaydedilemedi: ${error.message}`, "error");
      }
    });

    refs.btnPdf.addEventListener("click", () => {
      exportPdf();
    });

    refs.pdfYon.addEventListener("change", () => {
      state.ui.pdfOrientation = refs.pdfYon.value === "portrait" ? "portrait" : "landscape";
      UI.updateToolbarState();
      Renderer.requestRender();
    });

    refs.btnGeriAl.addEventListener("click", () => History.undo());
    refs.btnYinele.addEventListener("click", () => History.redo());
    refs.btnKopyala.addEventListener("click", () => Commands.copySelection());
    refs.btnYapistir.addEventListener("click", () => Commands.pasteClipboard());
    refs.btnSil.addEventListener("click", () => Commands.deleteSelection());
    if (refs.btnGrupla) {
      refs.btnGrupla.addEventListener("click", () => Commands.groupSelection());
    }

    refs.btnIzgara.addEventListener("click", () => {
      state.ui.showGrid = !state.ui.showGrid;
      Renderer.requestRender();
      UI.updateToolbarState();
    });

    refs.btnSnap.addEventListener("click", () => {
      state.ui.snapToGrid = !state.ui.snapToGrid;
      UI.updateToolbarState();
      showToast(state.ui.snapToGrid ? "Izgaraya yapış açık." : "Izgaraya yapış kapalı.", "info");
    });

    refs.btnZoomIn.addEventListener("click", () => zoomFromCenter(1.1));
    refs.btnZoomOut.addEventListener("click", () => zoomFromCenter(0.9));
    refs.btnZoomReset.addEventListener("click", () => {
      state.ui.scale = 1;
      state.ui.panX = 0;
      state.ui.panY = 0;
      Renderer.requestRender();
      UI.updateToolbarState();
    });
    if (refs.btnTema) {
      refs.btnTema.addEventListener("click", () => {
        applyUiTheme(state.ui.theme === "dark" ? "light" : "dark");
        UI.updateToolbarState();
      });
    }

    refs.btnOneGetir.addEventListener("click", () => Commands.bringSelectionToFront());
    refs.btnArkayaGonder.addEventListener("click", () => Commands.sendSelectionToBack());

    document.querySelectorAll("button[data-align]").forEach((button) => {
      button.addEventListener("click", () => {
        Commands.alignSelected(button.getAttribute("data-align"));
      });
    });

    document.querySelectorAll("button[data-distribute]").forEach((button) => {
      button.addEventListener("click", () => {
        Commands.distributeSelected(button.getAttribute("data-distribute"));
      });
    });

    if (refs.btnEklentiTema) {
      refs.btnEklentiTema.addEventListener("click", () => Commands.applyThemePreset());
    }
    if (refs.btnEklentiAkis) {
      refs.btnEklentiAkis.addEventListener("click", () => Commands.autoArrangeFlow());
    }
    if (refs.btnEklentiNot) {
      refs.btnEklentiNot.addEventListener("click", () => Commands.addStickyNote());
    }
  }

  function bindPropertiesEvents() {
    refs.propMetin.addEventListener("input", () => {
      mutateSingleNode((node) => {
        node.text = refs.propMetin.value;
      });
    });

    refs.propFontFamily.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.textStyle.fontFamily = refs.propFontFamily.value;
      });
    });

    refs.propFontSize.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.textStyle.fontSize = clamp(Number(refs.propFontSize.value) || 14, 8, 72);
      });
    });

    refs.propTextColor.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.textStyle.color = refs.propTextColor.value;
      });
    });

    refs.propTextAlign.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.textStyle.align = refs.propTextAlign.value;
      });
    });

    refs.propBold.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.textStyle.bold = refs.propBold.checked;
      });
    });

    refs.propItalic.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.textStyle.italic = refs.propItalic.checked;
      });
    });

    refs.propFill.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.shapeStyle.fill = refs.propFill.value;
      });
    });

    refs.propStroke.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.shapeStyle.stroke = refs.propStroke.value;
      });
    });

    refs.propStrokeWidth.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.shapeStyle.strokeWidth = clamp(Number(refs.propStrokeWidth.value) || 1, 1, 20);
      });
    });

    refs.propRadius.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.shapeStyle.radius = clamp(Number(refs.propRadius.value) || 0, 0, 80);
      });
    });

    refs.propW.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.w = Math.max(MIN_NODE_W, Number(refs.propW.value) || node.w);
      });
      UI.updatePropertiesPanel();
    });

    refs.propH.addEventListener("change", () => {
      mutateSingleNode((node) => {
        node.h = Math.max(MIN_NODE_H, Number(refs.propH.value) || node.h);
      });
      UI.updatePropertiesPanel();
    });

    refs.propEdgeStroke.addEventListener("change", () => {
      mutateSelectedEdge((edge) => {
        edge.style.stroke = refs.propEdgeStroke.value;
      });
    });

    refs.propEdgeStrokeWidth.addEventListener("change", () => {
      mutateSelectedEdge((edge) => {
        edge.style.strokeWidth = clamp(Number(refs.propEdgeStrokeWidth.value) || 1, 1, 12);
      });
    });

    refs.propEdgeDashed.addEventListener("change", () => {
      mutateSelectedEdge((edge) => {
        edge.style.dashed = refs.propEdgeDashed.checked;
      });
    });

    refs.propEdgeArrow.addEventListener("change", () => {
      mutateSelectedEdge((edge) => {
        edge.style.arrow = refs.propEdgeArrow.checked;
      });
    });

    if (refs.propEdgeType) {
      refs.propEdgeType.addEventListener("change", () => {
        mutateSelectedEdge((edge) => {
          const route = normalizeEdgeRoute(edge.route);
          route.type = normalizeEdgeType(refs.propEdgeType.value);
          if (route.type !== "orthogonal") {
            route.cornerRadius = 0;
          }
          edge.route = route;
        });
        UI.updatePropertiesPanel();
      });
    }

    if (refs.propEdgeCornerRadius) {
      refs.propEdgeCornerRadius.addEventListener("change", () => {
        mutateSelectedEdge((edge) => {
          const route = normalizeEdgeRoute(edge.route);
          route.cornerRadius = clamp(Number(refs.propEdgeCornerRadius.value) || 0, 0, 60);
          edge.route = route;
        });
      });
    }

    refs.propEdgeLabel.addEventListener("input", () => {
      mutateSelectedEdge((edge) => {
        edge.label.text = refs.propEdgeLabel.value;
      });
    });

    refs.propEdgeLabelSize.addEventListener("change", () => {
      mutateSelectedEdge((edge) => {
        edge.label.fontSize = clamp(Number(refs.propEdgeLabelSize.value) || 12, 8, 40);
      });
    });

    refs.propEdgeLabelColor.addEventListener("change", () => {
      mutateSelectedEdge((edge) => {
        edge.label.color = refs.propEdgeLabelColor.value;
      });
    });
  }

  function bindCanvasEvents() {
    refs.canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    refs.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const normalizedDelta =
          event.deltaMode === 1
            ? event.deltaY * 16
            : event.deltaMode === 2
              ? event.deltaY * 100
              : event.deltaY;
        const factor = Math.exp(-clamp(normalizedDelta, -240, 240) * 0.0015);
        zoomAtClient(event.clientX, event.clientY, factor);
      },
      { passive: false }
    );
  }

  function bindQuickAddEvents() {
    if (refs.quickPalette) {
      refs.quickPalette.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        const button = target.closest("button[data-quick-type]");
        if (!button) {
          return;
        }
        const type = button.getAttribute("data-quick-type");
        if (!type || !isSupportedNodeType(type)) {
          return;
        }
        event.preventDefault();
        Commands.addNodeFromQuickPalette(type);
      });
    }

    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!state.ui.quickAdd.open) {
          return;
        }
        const target = event.target;
        if (!(target instanceof Element)) {
          closeQuickPalette();
          Renderer.requestRender();
          return;
        }
        if (target.closest(".quick-palette") || target.closest(".quick-add-arrow")) {
          return;
        }
        closeQuickPalette();
        Renderer.requestRender();
      },
      true
    );
  }

  function bindKeyboardEvents() {
    window.addEventListener("keydown", (event) => {
      const target = event.target;
      const isInputTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.code === "Space" && !isInputTarget) {
        state.keyboard.spacePressed = true;
        event.preventDefault();
      }

      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      if (isInputTarget && ctrlOrCmd && event.key.toLowerCase() !== "s") {
        return;
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "z") {
        event.preventDefault();
        History.undo();
        return;
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "y") {
        event.preventDefault();
        History.redo();
        return;
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "c") {
        event.preventDefault();
        Commands.copySelection();
        return;
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "v") {
        event.preventDefault();
        Commands.pasteClipboard();
        return;
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "d") {
        event.preventDefault();
        Commands.duplicateSelection();
        return;
      }
      if (ctrlOrCmd && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const xml = Serialization.toXml(state.doc);
        downloadTextFile(xml, "flowchart.xml", "application/xml;charset=utf-8");
        showToast("XML dosyası indirildi.", "success");
        state.autoSave.dirty = false;
        persistAutoSaveSnapshot(true);
        return;
      }

      if (!isInputTarget && event.key === "Escape" && state.ui.quickAdd.open) {
        event.preventDefault();
        closeQuickPalette();
        Renderer.requestRender();
        return;
      }

      if (!isInputTarget && event.key === "Delete") {
        event.preventDefault();
        Commands.deleteSelection();
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        state.keyboard.spacePressed = false;
      }
    });

    window.addEventListener("blur", () => {
      state.keyboard.spacePressed = false;
    });
  }

  function runSmokeTest() {
    try {
      const xml = Serialization.toXml(state.doc);
      const parsed = Serialization.fromXml(xml);
      const ok = parsed.nodes.length === state.doc.nodes.length && parsed.edges.length === state.doc.edges.length;
      if (ok) {
        console.info("FlowChartTR test: Başarılı", {
          nodes: parsed.nodes.length,
          edges: parsed.edges.length
        });
      } else {
        throw new Error("XML serileştirme doğrulaması tutarsız.");
      }
    } catch (error) {
      console.error("FlowChartTR test hatası:", error);
      showToast("Başlangıç testi başarısız. Konsolu kontrol edin.", "error");
    }
  }

  function init() {
    tryRestoreAutoSave();
    bindToolbarEvents();
    bindPropertiesEvents();
    bindCanvasEvents();
    bindQuickAddEvents();
    bindKeyboardEvents();
    applyUiTheme(state.ui.theme, false);
    startAutoSaveLoop();
    waitForMathJaxReady();

    UI.updateToolbarState();
    UI.updatePropertiesPanel();
    Renderer.render();
    runSmokeTest();
    showToast("Diyagram hazır. Otomatik kayıt 5 dakikada bir çalışır.", "success");

    window.addEventListener("beforeunload", () => {
      if (state.autoSave.dirty) {
        persistAutoSaveSnapshot(true);
      }
    });
  }

  init();
})();

