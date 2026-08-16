// -*- mode: javascript; c-basic-offset: 2; -*-
// Copyright © 2026 PolyCrest Studio. All rights reserved.

/**
 * @license
 * @fileoverview 3D Hard-Surface Industrial Cyberpunk Block Geometry for PolyCrest App Studio
 * Precision 45-degree chamfers, mechanical dovetail notches, trapezoidal bus tabs,
 * and angled module visor hats matching tactile industrial reference aesthetics.
 */

'use strict';

goog.provide('AI.Blockly.CyberShapes');

(function() {
  function applyCyberpunkHardSurface() {
    if (typeof Blockly === 'undefined' || !Blockly.blockRendering) {
      return;
    }

    var ConstantProvider = Blockly.blockRendering.ConstantProvider;
    if (!ConstantProvider) {
      return;
    }

    ConstantProvider.prototype.FIELD_COLOUR_FULL_BLOCK = true;
    ConstantProvider.prototype.FIELD_TEXT_FONTSIZE = 11;
    ConstantProvider.prototype.FIELD_TEXT_FONTWEIGHT = '600';
    ConstantProvider.prototype.FIELD_TEXT_FONTFAMILY = "'Chakra Petch', sans-serif";
    ConstantProvider.prototype.FIELD_BORDER_RECT_RADIUS = 6;
    ConstantProvider.prototype.FIELD_BORDER_RECT_X_PADDING = 6;
    ConstantProvider.prototype.FIELD_BORDER_RECT_HEIGHT = 20;
    ConstantProvider.prototype.MEDIUM_PADDING = 10;
    ConstantProvider.prototype.LARGE_PADDING = 14;
    ConstantProvider.prototype.MEDIUM_LARGE_PADDING = 12;

    // Precise SVG Text Width Measurement (Eliminates All Text Collisions / Overlaps)
    if (Blockly.utils && Blockly.utils.dom) {
      var origGetFastTextWidth = Blockly.utils.dom.getFastTextWidth;
      var origGetFastTextWidthWithSizeString = Blockly.utils.dom.getFastTextWidthWithSizeString;

      Blockly.utils.dom.getFastTextWidth = function(textElement, fontSize, fontWeight, fontFamily) {
        if (textElement && typeof textElement.getComputedTextLength === 'function') {
          try {
            var len = textElement.getComputedTextLength();
            if (len > 0) return Math.ceil(len) + 4;
          } catch(e) {}
        }
        if (textElement && typeof textElement.getBBox === 'function') {
          try {
            var bbox = textElement.getBBox();
            if (bbox && bbox.width > 0) return Math.ceil(bbox.width) + 4;
          } catch(e) {}
        }
        if (origGetFastTextWidth) {
          return origGetFastTextWidth.call(this, textElement, fontSize, fontWeight, fontFamily) + 4;
        }
        return 24;
      };

      Blockly.utils.dom.getFastTextWidthWithSizeString = function(textElement, fontSize, fontWeight, fontFamily) {
        if (textElement && typeof textElement.getComputedTextLength === 'function') {
          try {
            var len = textElement.getComputedTextLength();
            if (len > 0) return Math.ceil(len) + 4;
          } catch(e) {}
        }
        if (textElement && typeof textElement.getBBox === 'function') {
          try {
            var bbox = textElement.getBBox();
            if (bbox && bbox.width > 0) return Math.ceil(bbox.width) + 4;
          } catch(e) {}
        }
        if (origGetFastTextWidthWithSizeString) {
          return origGetFastTextWidthWithSizeString.call(this, textElement, fontSize, fontWeight, fontFamily) + 4;
        }
        return 24;
      };
    }

    // In-row spacing between fields & textboxes (guarantees clean separation)
    if (Blockly.geras && Blockly.geras.RenderInfo) {
      var origGetInRowSpacing = Blockly.geras.RenderInfo.prototype.getInRowSpacing_;
      Blockly.geras.RenderInfo.prototype.getInRowSpacing_ = function(a, b) {
        var spacing = origGetInRowSpacing ? origGetInRowSpacing.call(this, a, b) : 8;
        if ((a && a.isEditable) || (b && b.isEditable)) {
          return Math.max(spacing, 12);
        }
        return Math.max(spacing, 8);
      };
    }

    // 1. Outside 45-Degree Hard-Surface Industrial Chamfers
    ConstantProvider.prototype.makeOutsideCorners = function() {
      var a = this.CORNER_RADIUS || 6;
      return {
        topLeft: ' m 0,' + a + ' l ' + a + ',-' + a,
        topRight: ' l ' + a + ',' + a,
        bottomRight: ' l -' + a + ',' + a,
        bottomLeft: ' l -' + a + ',-' + a,
        rightHeight: a
      };
    };

    // 2. Inside Statement Mouth Chamfers
    ConstantProvider.prototype.makeInsideCorners = function() {
      var a = this.CORNER_RADIUS || 6;
      return {
        width: a,
        height: a,
        pathTop: ' l -' + a + ',' + a,
        pathBottom: ' l ' + a + ',' + a
      };
    };

    // 3. Heavy Mechanical Dovetail Statement Notches
    ConstantProvider.prototype.makeNotch = function() {
      var b = this.NOTCH_WIDTH || 18;
      var c = this.NOTCH_HEIGHT || 4;
      var bevel = 3;
      var mid = Math.max(0, b - (bevel * 2) - 6);
      var pathLeft = ' l 3,0 l ' + bevel + ',' + c + ' l ' + mid + ',0 l ' + bevel + ',-' + c + ' l 3,0';
      var pathRight = ' l -3,0 l -' + bevel + ',' + c + ' l -' + mid + ',0 l -' + bevel + ',-' + c + ' l -3,0';
      return {
        type: this.SHAPES.NOTCH,
        width: b,
        height: c,
        pathLeft: pathLeft,
        pathRight: pathRight
      };
    };

    // 4. Stepped Industrial Hardware Bus Puzzle Tabs
    ConstantProvider.prototype.makePuzzleTab = function() {
      var b = this.TAB_WIDTH || 8;
      var c = this.TAB_HEIGHT || 16;
      var half = c / 2;
      var slope = 4;
      var flat = Math.max(0, c - (slope * 2));
      var pathDown = ' l -' + b + ',' + slope + ' l 0,' + flat + ' l ' + b + ',' + slope;
      var pathUp = ' l -' + b + ',-' + slope + ' l 0,-' + flat + ' l ' + b + ',-' + slope;
      return {
        type: this.SHAPES.PUZZLE,
        width: b,
        height: c,
        pathDown: pathDown,
        pathUp: pathUp
      };
    };

    // 5. Angled Module Visor / Hat for Event Entry Blocks
    ConstantProvider.prototype.makeStartHat = function() {
      var a = this.START_HAT_HEIGHT || 12;
      var b = this.START_HAT_WIDTH || 100;
      var slopeW = 16;
      var flatW = Math.max(0, b - (slopeW * 2));
      var path = ' l ' + slopeW + ',-' + a + ' l ' + flatW + ',0 l ' + slopeW + ',' + a;
      return {
        height: a,
        width: b,
        path: path
      };
    };

    // 6. Jagged Collapsed Edge
    ConstantProvider.prototype.makeJaggedTeeth = function() {
      var a = this.JAGGED_TEETH_HEIGHT || 12;
      var b = this.JAGGED_TEETH_WIDTH || 10.2;
      var path = ' l ' + b + ',' + (a / 4) + ' l -' + (2 * b) + ',' + (a / 2) + ' l ' + b + ',' + (a / 4);
      return {
        height: a,
        width: b,
        path: path
      };
    };

    // Update HighlightConstantProvider if present in Geras
    if (Blockly.geras && Blockly.geras.HighlightConstantProvider) {
      var Highlight = Blockly.geras.HighlightConstantProvider;

      Highlight.prototype.makeInsideCorner = function() {
        var a = this.constantProvider.CORNER_RADIUS || 6;
        var b = this.OFFSET || 0.5;
        var d = ' m ' + b + ',' + b + ' l -' + a + ',' + a;
        var e = ' l ' + (a + b) + ',' + (a + b);
        var f = ' m ' + b + ',-' + b + ' l ' + (a + b) + ',' + (a + b);
        return {
          width: a + b,
          height: a,
          pathTop: function(rtl) { return rtl ? d : ''; },
          pathBottom: function(rtl) { return rtl ? e : f; }
        };
      };

      Highlight.prototype.makeOutsideCorner = function() {
        var a = this.constantProvider.CORNER_RADIUS || 6;
        var b = this.OFFSET || 0.5;
        var d = ' m ' + b + ',' + b + ' l ' + (a - b) + ',-' + (a - b);
        var e = ' m ' + b + ',' + a + ' l ' + (a - b) + ',-' + (a - b);
        var g = ' m ' + b + ',-' + b + ' l -' + (a - b) + ',-' + (a - b);
        return {
          height: a,
          topLeft: function(rtl) { return rtl ? d : e; },
          bottomLeft: function() { return g; }
        };
      };

      Highlight.prototype.makePuzzleTab = function() {
        var a = this.constantProvider.TAB_WIDTH || 8;
        var b = this.constantProvider.TAB_HEIGHT || 16;
        var slope = 4;
        var flat = Math.max(0, b - (slope * 2));
        var c = ' m -2,-' + (b - 3.4) + ' l -' + (0.45 * a) + ',-2.1';
        var d = ' v 2.5 m -' + (0.97 * a) + ',2.5 l ' + (0.3 * a) + ',9.5 m ' + (0.67 * a) + ',-1.9 v 2.5';
        var e = ' v -1.5 m -' + (0.92 * a) + ',-0.5 l 0,-11 m ' + (0.92 * a) + ',1';
        var f = ' m -5,' + (b - 0.7) + ' l ' + (0.46 * a) + ',-2.1';
        return {
          width: a,
          height: b,
          pathUp: function(rtl) { return rtl ? c : e; },
          pathDown: function(rtl) { return rtl ? d : f; }
        };
      };

      Highlight.prototype.makeNotch = function() {
        return {
          pathLeft: ' h ' + (this.OFFSET || 0.5) + this.constantProvider.NOTCH.pathLeft
        };
      };

      Highlight.prototype.makeStartHat = function() {
        var a = this.constantProvider.START_HAT.height;
        var slopeW = 16;
        var flatW = Math.max(0, this.constantProvider.START_HAT.width - (slopeW * 2));
        var b = ' m ' + slopeW + ',-' + a + ' l ' + flatW + ',0 l ' + slopeW + ',' + a;
        var c = ' m ' + slopeW + ',-' + a + ' l ' + flatW + ',0 l ' + slopeW + ',' + a;
        return {
          path: function(rtl) { return rtl ? b : c; }
        };
      };
    }

    // 7. Blender Node Style Left Accent Color System (Dark Body + Left Category Accent Stripe)
    function getOrCreateAccentGradient(workspace, hexColour) {
      if (!hexColour || typeof hexColour !== 'string') return hexColour;
      var cleanId = 'blocklyNodeGrad_' + hexColour.replace(/[^a-zA-Z0-9]/g, '');
      var svg = workspace.getParentSvg ? workspace.getParentSvg() : (workspace.getCanvas ? workspace.getCanvas().ownerSVGElement : null);
      if (!svg) {
        svg = document.querySelector('svg.blocklySvg');
      }
      if (!svg) return hexColour;

      var defs = svg.querySelector('defs');
      if (!defs) {
        defs = Blockly.utils.dom.createSvgElement('defs', {}, svg);
      }

      var existing = defs.querySelector('#' + cleanId);
      if (!existing) {
        var grad = Blockly.utils.dom.createSvgElement('linearGradient', {
          'id': cleanId,
          'x1': '0',
          'y1': '0',
          'x2': '6',
          'y2': '0',
          'gradientUnits': 'userSpaceOnUse'
        }, defs);

        // Left accent stripe (0 to 5.5px) in category accent color
        Blockly.utils.dom.createSvgElement('stop', {
          'offset': '0%',
          'stop-color': hexColour,
          'stop-opacity': '1'
        }, grad);
        Blockly.utils.dom.createSvgElement('stop', {
          'offset': '90%',
          'stop-color': hexColour,
          'stop-opacity': '1'
        }, grad);

        // Deep Obsidian Blue Body (from 5.5px onward)
        Blockly.utils.dom.createSvgElement('stop', {
          'offset': '91%',
          'stop-color': '#121723',
          'stop-opacity': '1'
        }, grad);
        Blockly.utils.dom.createSvgElement('stop', {
          'offset': '100%',
          'stop-color': '#121723',
          'stop-opacity': '1'
        }, grad);
      }
      return 'url(#' + cleanId + ')';
    }

    if (Blockly.geras && Blockly.geras.PathObject) {
      var GerasPathObject = Blockly.geras.PathObject;
      var origGerasApplyColour = GerasPathObject.prototype.applyColour;

      GerasPathObject.prototype.applyColour = function(block) {
        if (origGerasApplyColour) {
          origGerasApplyColour.call(this, block);
        }

        if (!block || !block.workspace) return;

        // Keep pure color picker / swatch blocks full color
        if (block.type && (block.type.indexOf('color_') === 0 || block.type === 'color_black')) {
          return;
        }

        var rawColour = block.getColour();
        if (rawColour) {
          var gradUrl = getOrCreateAccentGradient(block.workspace, rawColour);
          this.svgPath.setAttribute('fill', gradUrl);
          this.svgPath.setAttribute('stroke', 'none');
          this.svgPath.setAttribute('stroke-width', '0');
        }
      };
    }
  }

  applyCyberpunkHardSurface();
})();
