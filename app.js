(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const GRID_SIZE = 10;
  const MIN_NODE_W = 40;
  const MIN_NODE_H = 30;
  const HISTORY_LIMIT = 50;
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
    viewport: document.getElementById("viewport"),
    gridRect: document.getElementById("gridRect"),
    edgeLayer: document.getElementById("edgeLayer"),
    nodeLayer: document.getElementById("nodeLayer"),
    overlayLayer: document.getElementById("overlayLayer"),
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

    btnIzgara: document.getElementById("btnIzgara"),
    btnSnap: document.getElementById("btnSnap"),
    btnZoomIn: document.getElementById("btnZoomIn"),
    btnZoomOut: document.getElementById("btnZoomOut"),
    btnZoomReset: document.getElementById("btnZoomReset"),

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
    propEdgeLabel: document.getElementById("propEdgeLabel"),
    propEdgeLabelSize: document.getElementById("propEdgeLabelSize"),
    propEdgeLabelColor: document.getElementById("propEdgeLabelColor")
  };

  if (!refs.canvas) {
    return;
  }

  const defaultTextStyle = {
    fontFamily: "Arial",
    fontSize: 14,
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

  const defaultEdgeLabel = {
    text: "",
    fontSize: 12,
    color: "#111111"
  };

  let idCounter = 1;

  // Uygulamanın tekil durumu: model, seçim, görünüm ve etkileşim bilgileri.
  const state = {
    doc: createSampleDocument(),
    selectedNodeIds: new Set(),
    selectedEdgeId: null,
    ui: {
      showGrid: true,
      snapToGrid: false,
      scale: 1,
      panX: 0,
      panY: 0,
      pdfOrientation: "landscape",
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
    interaction: {
      mode: null,
      pointerId: null,
      moved: false,
      startWorld: null,
      currentWorld: null,
      startClient: null,
      startPan: null,
      dragItems: [],
      resizeItem: null,
      connectFrom: null,
      marqueeAdditive: false
    },
    rafPending: false,
    panelSync: false
  };

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

  function isSupportedNodeType(type) {
    return SUPPORTED_NODE_TYPES.includes(type);
  }

  function snap(value) {
    if (!state.ui.snapToGrid) {
      return value;
    }
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
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

  function createEmptyDocument() {
    return {
      nodes: [],
      edges: [],
      meta: {
        version: "1.0",
        createdAt: new Date().toISOString(),
        app: "FlowChartTR"
      }
    };
  }

  function createNode(type, x, y, id = generateId("n")) {
    const size = {
      dikdortgen: { w: 180, h: 80 },
      yuvarlatilmis: { w: 180, h: 80 },
      oval: { w: 180, h: 80 },
      elmas: { w: 190, h: 110 },
      paralelkenar: { w: 190, h: 86 },
      silindir: { w: 190, h: 110 },
      belge: { w: 190, h: 95 },
      altSurec: { w: 200, h: 90 },
      not: { w: 180, h: 90 }
    }[type] || { w: 180, h: 80 };

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
      from: { nodeId: fromNodeId, anchor: normalizeAnchor(fromAnchor) },
      to: { nodeId: toNodeId, anchor: normalizeAnchor(toAnchor) },
      style: cloneDeep(defaultEdgeStyle),
      label: cloneDeep(defaultEdgeLabel)
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
      if (nodeIdSet.has(nodeId)) {
        nextSelection.add(nodeId);
      }
    });
    state.selectedNodeIds = nextSelection;

    if (state.selectedEdgeId && !getEdgeById(state.selectedEdgeId)) {
      state.selectedEdgeId = null;
    }
  }

  function clearSelection() {
    state.selectedNodeIds.clear();
    state.selectedEdgeId = null;
  }

  function selectSingleNode(nodeId) {
    state.selectedNodeIds = new Set([nodeId]);
    state.selectedEdgeId = null;
  }

  function toggleNodeSelection(nodeId) {
    state.selectedEdgeId = null;
    if (state.selectedNodeIds.has(nodeId)) {
      state.selectedNodeIds.delete(nodeId);
    } else {
      state.selectedNodeIds.add(nodeId);
    }
  }

  function selectSingleEdge(edgeId) {
    state.selectedNodeIds.clear();
    state.selectedEdgeId = edgeId;
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
      if (before !== after) {
        state.history.undo.push(state.history.pendingSnapshot);
        if (state.history.undo.length > HISTORY_LIMIT) {
          state.history.undo.shift();
        }
        state.history.redo = [];
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

  function buildOrthogonalPoints(startPoint, endPoint, startAnchor) {
    const horizontalStart = startAnchor === "left" || startAnchor === "right";
    const points = [startPoint];

    if (horizontalStart) {
      const midX = (startPoint.x + endPoint.x) / 2;
      points.push({ x: midX, y: startPoint.y });
      points.push({ x: midX, y: endPoint.y });
    } else {
      const midY = (startPoint.y + endPoint.y) / 2;
      points.push({ x: startPoint.x, y: midY });
      points.push({ x: endPoint.x, y: midY });
    }

    points.push(endPoint);
    return removeDuplicatePoints(points);
  }

  function pointsToPath(points) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
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

  function getEdgeEndpoints(edge) {
    const fromNode = getNodeById(edge.from.nodeId);
    const toNode = getNodeById(edge.to.nodeId);
    if (!fromNode || !toNode) {
      return null;
    }
    return {
      fromPoint: getAnchorPoint(fromNode, edge.from.anchor),
      toPoint: getAnchorPoint(toNode, edge.to.anchor)
    };
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

      refs.edgeLayer.replaceChildren();
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

      orderedNodes.forEach((node) => {
        const isSelected = state.selectedNodeIds.has(node.id);
        const showAnchors =
          state.interaction.mode === "connect" || (isSelected && singleSelectedNodeId === node.id);
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

      Renderer.renderOverlay();
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
        group.appendChild(shape);
      };

      const appendShapeDetail = (shape) => {
        shape.setAttribute("class", "node-shape node-shape-detail");
        shape.setAttribute("fill", "none");
        shape.setAttribute("stroke", strokeColor);
        shape.setAttribute("stroke-width", Math.max(1, strokeWidth * 0.8));
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
      const handles = {
        nw: { x: 0, y: 0 },
        n: { x: node.w / 2, y: 0 },
        ne: { x: node.w, y: 0 },
        e: { x: node.w, y: node.h / 2 },
        se: { x: node.w, y: node.h },
        s: { x: node.w / 2, y: node.h },
        sw: { x: 0, y: node.h },
        w: { x: 0, y: node.h / 2 }
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

    buildEdgeElement(edge, selected, interactive) {
      const endpoints = getEdgeEndpoints(edge);
      if (!endpoints) {
        return null;
      }

      const points = buildOrthogonalPoints(endpoints.fromPoint, endpoints.toPoint, edge.from.anchor);
      const pathData = pointsToPath(points);

      const group = createSvgElement("g", {
        class: `edge${selected ? " selected" : ""}`,
        "data-edge-id": edge.id
      });

      const path = createSvgElement("path", {
        class: "edge-path",
        d: pathData,
        stroke: edge.style.stroke || defaultEdgeStyle.stroke,
        "stroke-width": Number(edge.style.strokeWidth) || defaultEdgeStyle.strokeWidth,
        "stroke-dasharray": edge.style.dashed ? "7 5" : "none"
      });
      if (edge.style.arrow) {
        path.setAttribute("marker-end", "url(#arrowHead)");
      }
      group.appendChild(path);

      if (interactive) {
        const hitPath = createSvgElement("path", {
          class: "edge-hit",
          d: pathData
        });
        group.appendChild(hitPath);
      }

      if (edge.label && edge.label.text) {
        const labelPoint = getPolylineMidPoint(points);
        const label = createSvgElement("text", {
          class: "edge-label",
          x: labelPoint.x,
          y: labelPoint.y - 6,
          "font-size": Number(edge.label.fontSize) || defaultEdgeLabel.fontSize,
          fill: edge.label.color || defaultEdgeLabel.color,
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
        const previewPoints = buildOrthogonalPoints(
          fromPoint,
          state.interaction.currentWorld,
          state.interaction.connectFrom.anchor
        );
        const path = createSvgElement("path", {
          class: "connection-preview",
          d: pointsToPath(previewPoints)
        });
        refs.overlayLayer.appendChild(path);
      }
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
      const marker = createSvgElement("marker", {
        id: "arrowHead",
        markerWidth: 10,
        markerHeight: 10,
        refX: 9,
        refY: 5,
        orient: "auto",
        markerUnits: "strokeWidth"
      });
      const markerPath = createSvgElement("path", {
        d: "M0,0 L10,5 L0,10 Z",
        fill: "context-stroke"
      });
      marker.appendChild(markerPath);
      defs.appendChild(marker);
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
        const edgeEl = Renderer.buildEdgeElement(edge, false, false);
        if (edgeEl) {
          edgeLayer.appendChild(edgeEl);
        }
      });
      svg.appendChild(edgeLayer);

      const nodeLayer = createSvgElement("g");
      [...state.doc.nodes]
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        .forEach((node) => {
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

        lines.push(
          `    <edge id="${escapeXml(edge.id)}" from="${escapeXml(edge.from.nodeId)}:${escapeXml(
            edge.from.anchor
          )}" to="${escapeXml(edge.to.nodeId)}:${escapeXml(edge.to.anchor)}" stroke="${escapeXml(style.stroke)}" strokeWidth="${
            style.strokeWidth
          }" dashed="${style.dashed ? "1" : "0"}" arrow="${style.arrow ? "1" : "0"}">`
        );
        lines.push(
          `      <label fontSize="${label.fontSize}" color="${escapeXml(label.color)}">${escapeXml(label.text || "")}</label>`
        );
        lines.push(`    </edge>`);
      });

      lines.push(`  </edges>`);
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

        if (!usedNodeIds.has(fromNodeId) || !usedNodeIds.has(toNodeId)) {
          throw new Error(`Edge node referansı bulunamadı: ${id}`);
        }

        const edge = createEdge(fromNodeId, fromAnchor, toNodeId, toAnchor, id);
        edge.style = {
          stroke: sanitizeColor(edgeEl.getAttribute("stroke"), defaultEdgeStyle.stroke),
          strokeWidth: Math.max(1, parseNumberAttr(edgeEl.getAttribute("strokeWidth"), defaultEdgeStyle.strokeWidth)),
          dashed: parseBooleanAttr(edgeEl.getAttribute("dashed"), defaultEdgeStyle.dashed),
          arrow: parseBooleanAttr(edgeEl.getAttribute("arrow"), defaultEdgeStyle.arrow)
        };

        const labelEl = edgeEl.getElementsByTagName("label")[0];
        if (labelEl) {
          edge.label = {
            text: labelEl.textContent || "",
            fontSize: Math.max(8, parseNumberAttr(labelEl.getAttribute("fontSize"), defaultEdgeLabel.fontSize)),
            color: sanitizeColor(labelEl.getAttribute("color"), defaultEdgeLabel.color)
          };
        }

        usedEdgeIds.add(id);
        result.edges.push(edge);
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
    doc.edges = doc.edges.filter(
      (edge) => nodeIdSet.has(edge.from.nodeId) && nodeIdSet.has(edge.to.nodeId)
    );

    doc.edges.forEach((edge) => {
      edge.from.anchor = normalizeAnchor(edge.from.anchor);
      edge.to.anchor = normalizeAnchor(edge.to.anchor);
      edge.style = {
        stroke: sanitizeColor(edge.style?.stroke, defaultEdgeStyle.stroke),
        strokeWidth: Math.max(1, Number(edge.style?.strokeWidth) || defaultEdgeStyle.strokeWidth),
        dashed: Boolean(edge.style?.dashed),
        arrow: edge.style?.arrow !== false
      };
      edge.label = {
        text: typeof edge.label?.text === "string" ? edge.label.text : "",
        fontSize: Math.max(8, Number(edge.label?.fontSize) || defaultEdgeLabel.fontSize),
        color: sanitizeColor(edge.label?.color, defaultEdgeLabel.color)
      };
    });

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

  function computeDocumentBounds() {
    if (!state.doc.nodes.length) {
      return {
        minX: -100,
        minY: -100,
        maxX: 900,
        maxY: 600
      };
    }

    const minX = Math.min(...state.doc.nodes.map((node) => node.x));
    const minY = Math.min(...state.doc.nodes.map((node) => node.y));
    const maxX = Math.max(...state.doc.nodes.map((node) => node.x + node.w));
    const maxY = Math.max(...state.doc.nodes.map((node) => node.y + node.h));
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

      let rendered = false;
      if (window.svg2pdf) {
        try {
          await window.svg2pdf(exportSvg, pdf, {
            xOffset: margin,
            yOffset: margin,
            scale: Math.min(
              (pageWidth - margin * 2) / (bounds.maxX - bounds.minX),
              (pageHeight - margin * 2) / (bounds.maxY - bounds.minY)
            )
          });
          rendered = true;
        } catch (svg2PdfError) {
          console.warn("svg2pdf başarısız oldu, canvas yöntemi deneniyor:", svg2PdfError);
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
    const qualityScale = Math.max(2, Math.round((window.devicePixelRatio || 1) * 2));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * ratio * qualityScale));
    canvas.height = Math.max(1, Math.round(sourceHeight * ratio * qualityScale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas bağlamı oluşturulamadı.");
    }
    ctx.setTransform(qualityScale * ratio, 0, 0, qualityScale * ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sourceWidth, sourceHeight);

    if (window.canvg && window.canvg.Canvg) {
      try {
        const v = await window.canvg.Canvg.fromString(ctx, svgText, {
          ignoreAnimation: true,
          ignoreMouse: true
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

    pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", margin, margin, drawWidth, drawHeight);
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
      if (!state.selectedNodeIds.size && !state.selectedEdgeId) {
        return;
      }

      withHistory(() => {
        if (state.selectedNodeIds.size) {
          const ids = new Set(state.selectedNodeIds);
          state.doc.nodes = state.doc.nodes.filter((node) => !ids.has(node.id));
          state.doc.edges = state.doc.edges.filter(
            (edge) => !ids.has(edge.from.nodeId) && !ids.has(edge.to.nodeId)
          );
        }

        if (state.selectedEdgeId) {
          state.doc.edges = state.doc.edges.filter((edge) => edge.id !== state.selectedEdgeId);
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
      refs.btnSil.disabled = state.selectedNodeIds.size === 0 && !state.selectedEdgeId;
      refs.btnIzgara.dataset.active = state.ui.showGrid ? "1" : "0";
      refs.btnSnap.dataset.active = state.ui.snapToGrid ? "1" : "0";
      refs.pdfYon.value = state.ui.pdfOrientation;
      if (refs.zoomSeviye) {
        refs.zoomSeviye.textContent = `%${Math.round(state.ui.scale * 100)}`;
      }
    },

    updatePropertiesPanel() {
      state.panelSync = true;

      const selectedNodes = state.doc.nodes.filter((node) => state.selectedNodeIds.has(node.id));
      const selectedEdge = state.selectedEdgeId ? getEdgeById(state.selectedEdgeId) : null;

      refs.blokOzellikleri.hidden = true;
      refs.baglantiOzellikleri.hidden = true;

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
      } else if (selectedEdge) {
        refs.secimBilgi.textContent = `Seçili bağlantı: ${selectedEdge.id}`;
        refs.baglantiOzellikleri.hidden = false;

        refs.propEdgeStroke.value = selectedEdge.style.stroke;
        refs.propEdgeStrokeWidth.value = selectedEdge.style.strokeWidth;
        refs.propEdgeDashed.checked = Boolean(selectedEdge.style.dashed);
        refs.propEdgeArrow.checked = Boolean(selectedEdge.style.arrow);
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
    if (state.panelSync || state.selectedNodeIds.size !== 1) {
      return;
    }
    const nodeId = [...state.selectedNodeIds][0];
    const node = getNodeById(nodeId);
    if (!node) {
      return;
    }

    withHistory(() => {
      mutator(node);
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
      .filter((node) => rectsIntersect(marqueeRect, getNodeBounds(node)))
      .map((node) => node.id);

    if (!state.interaction.marqueeAdditive) {
      state.selectedNodeIds = new Set(hitNodeIds);
    } else {
      hitNodeIds.forEach((nodeId) => state.selectedNodeIds.add(nodeId));
    }
    state.selectedEdgeId = null;
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
    state.interaction.resizeItem = null;
    state.interaction.connectFrom = null;
    state.interaction.marqueeAdditive = false;
    document.body.style.cursor = "default";
  }

  function onPointerDown(event) {
    const handleEl = event.target.closest(".resize-handle");
    const anchorEl = event.target.closest(".anchor");
    const nodeEl = event.target.closest(".node");
    const edgeEl = event.target.closest(".edge");

    const isPanTrigger =
      event.button === 1 ||
      (state.keyboard.spacePressed && event.button === 0 && !handleEl && !anchorEl && !nodeEl && !edgeEl);

    if (isPanTrigger) {
      event.preventDefault();
      startPan(event);
      return;
    }

    if (event.button !== 0) {
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

    if (state.interaction.mode === "connect") {
      const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
      const dropAnchor = dropTarget ? dropTarget.closest(".anchor") : null;

      let created = false;
      if (dropAnchor && state.interaction.connectFrom) {
        const from = state.interaction.connectFrom;
        const toNodeId = dropAnchor.getAttribute("data-node-id");
        const toAnchor = normalizeAnchor(dropAnchor.getAttribute("data-anchor") || "left");

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
    });

    refs.btnGeriAl.addEventListener("click", () => History.undo());
    refs.btnYinele.addEventListener("click", () => History.redo());
    refs.btnKopyala.addEventListener("click", () => Commands.copySelection());
    refs.btnYapistir.addEventListener("click", () => Commands.pasteClipboard());
    refs.btnSil.addEventListener("click", () => Commands.deleteSelection());

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
        if (!event.ctrlKey && !event.metaKey) {
          return;
        }
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.08 : 0.92;
        zoomAtClient(event.clientX, event.clientY, factor);
      },
      { passive: false }
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
      if (ctrlOrCmd && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const xml = Serialization.toXml(state.doc);
        downloadTextFile(xml, "flowchart.xml", "application/xml;charset=utf-8");
        showToast("XML dosyası indirildi.", "success");
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
      const ok = parsed.nodes.length >= 4 && parsed.edges.length >= 4;
      if (ok) {
        console.info("FlowChartTR test: Başarılı", {
          nodes: parsed.nodes.length,
          edges: parsed.edges.length
        });
      } else {
        throw new Error("Örnek veri beklenen boyutta değil.");
      }
    } catch (error) {
      console.error("FlowChartTR test hatası:", error);
      showToast("Başlangıç testi başarısız. Konsolu kontrol edin.", "error");
    }
  }

  function init() {
    bindToolbarEvents();
    bindPropertiesEvents();
    bindCanvasEvents();
    bindKeyboardEvents();

    UI.updateToolbarState();
    UI.updatePropertiesPanel();
    Renderer.render();
    runSmokeTest();
    showToast("Örnek diyagram yüklendi.", "success");
  }

  init();
})();
