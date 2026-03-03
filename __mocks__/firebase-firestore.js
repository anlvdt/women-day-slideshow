/**
 * Enhanced Firebase Firestore mock for integration testing.
 * Supports:
 * - addDoc: captures calls, returns mock doc ref
 * - getDocs: configurable to return mock data via _setMockDocs
 * - serverTimestamp: returns a recognizable mock value
 * - collection, query, orderBy: pass-through stubs
 */

// Internal state for capturing and configuring mock behavior
let _addDocCalls = [];
let _mockDocsMap = {}; // keyed by collection name

export function _resetMocks() {
  _addDocCalls = [];
  _mockDocsMap = {};
}

export function _getAddDocCalls() {
  return _addDocCalls;
}

/**
 * Configure getDocs to return specific documents for a collection.
 * @param {string} collectionName
 * @param {Array<{id: string, data: object}>} docs
 */
export function _setMockDocs(collectionName, docs) {
  _mockDocsMap[collectionName] = docs;
}

export function getFirestore() {
  return { _type: "firestore" };
}

export function collection(_db, collectionName) {
  return { _type: "collectionRef", _name: collectionName };
}

export function getDocs(queryRef) {
  const collectionName = queryRef._collectionName || queryRef._name || "";
  const mockDocs = _mockDocsMap[collectionName] || [];
  return {
    docs: mockDocs.map((d) => ({
      id: d.id,
      data: () => d.data,
    })),
  };
}

export function query(collectionRef, ..._constraints) {
  return { _type: "query", _collectionName: collectionRef._name };
}

export function orderBy(_field, _direction) {
  return { _type: "orderBy" };
}

export function addDoc(collectionRef, data) {
  _addDocCalls.push({ collection: collectionRef._name, data });
  return { id: "mock-doc-id-" + Date.now() };
}

export function serverTimestamp() {
  return { _type: "serverTimestamp" };
}
