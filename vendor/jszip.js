// JSZip has no ES module version. Loading jszip.min.js puts JSZip on the
// global object; this tiny file hands it out as a normal import:
//   import JSZip from 'jszip';
import './jszip.min.js';

export default globalThis.JSZip;
