/**
 * ============================================================================
 * dressCardTemplate.js — Luxury Canvas & Export Facade for Dress Cards
 * Domain: Tailoring & Atelier Services | Architecture Standard: Rule 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  const Canvas = window.DressCardCanvas || {};
  const Share = window.DressCardShare || {};

  const DressCardTemplate = {
    drawDressCardQR: Share.drawDressCardQR || window.drawDressCardQR,
    renderDressCardToCanvas: Canvas.renderDressCardToCanvas || window.renderDressCardToCanvas,
    downloadDressCardImage: Canvas.downloadDressCardImage || window.downloadDressCardImage,
    copyDressCardImage: Canvas.copyDressCardImage || window.copyDressCardImage,
    shareDressCardWhatsApp: Share.shareDressCardWhatsApp || window.shareDressCardWhatsApp
  };

  window.DressCardTemplate = DressCardTemplate;
  window.drawDressCardQR = DressCardTemplate.drawDressCardQR;
  window.renderDressCardToCanvas = DressCardTemplate.renderDressCardToCanvas;
  window.downloadDressCardImage = DressCardTemplate.downloadDressCardImage;
  window.copyDressCardImage = DressCardTemplate.copyDressCardImage;
  window.shareDressCardWhatsApp = DressCardTemplate.shareDressCardWhatsApp;

})(typeof window !== 'undefined' ? window : globalThis);
