/**
 * BTP Agentation — npm package entry point
 *
 * Usage:
 *   const btpAgentation = require('btp-agentation');
 *
 *   // Get the script content as a string (for injection)
 *   const script = btpAgentation.getScript();
 *
 *   // Get the bookmarklet code
 *   const bookmarklet = btpAgentation.getBookmarklet();
 *
 *   // Get the CDN URL (GitHub Pages)
 *   const cdnUrl = btpAgentation.getCdnUrl();
 *
 *   // Get the script tag HTML
 *   const scriptTag = btpAgentation.getScriptTag();
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, 'btp-agentation.js');
const CDN_URL = 'https://pcmn1000.github.io/my-side-by-side-app/btp-agentation.js';

module.exports = {
    /**
     * Returns the full BTP Agentation script content as a string
     */
    getScript: function() {
        return fs.readFileSync(SCRIPT_PATH, 'utf8');
    },

    /**
     * Returns the path to the script file
     */
    getScriptPath: function() {
        return SCRIPT_PATH;
    },

    /**
     * Returns the CDN URL (GitHub Pages hosted)
     */
    getCdnUrl: function() {
        return CDN_URL;
    },

    /**
     * Returns a ready-to-use HTML script tag
     */
    getScriptTag: function() {
        return '<script src="' + CDN_URL + '"></script>';
    },

    /**
     * Returns the bookmarklet JavaScript code
     */
    getBookmarklet: function() {
        return "javascript:void(function(){if(document.getElementById('fa-toolbar')){return}var s=document.createElement('script');s.src='" + CDN_URL + "';document.head.appendChild(s)}())";
    },

    /**
     * Returns the console snippet for DevTools
     */
    getConsoleSnippet: function() {
        return "var s=document.createElement('script');s.src='" + CDN_URL + "';document.head.appendChild(s);";
    }
};
