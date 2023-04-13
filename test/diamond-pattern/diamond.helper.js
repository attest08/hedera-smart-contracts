let DiamondHelper = {
  FacetCutAction: {Add: 0, Replace: 1, Remove: 2},

  getSelectors: function (contract) {
    const selectors = Object.keys(contract.interface.functions).reduce((acc, val) => {
      if (val !== 'init(bytes)') {
        acc.push(contract.interface.getSighash(val));
      }
      return acc;
    }, []);

    selectors.contract = contract;
    selectors.remove = this.remove;
    selectors.get = this.get;

    return selectors;
  },

  remove: function (functionNames) {
    const selectors = this.filter((v) => {
      for (const functionName of functionNames) {
        if (v === this.contract.interface.getSighash(functionName)) {
          return false;
        }
      }

      return true;
    });

    selectors.contract = this.contract;
    selectors.remove = this.remove;
    selectors.get = this.get;

    return selectors;
  },

  get: function (functionNames) {
    const selectors = this.filter((v) => {
      for (const functionName of functionNames) {
        if (v === this.contract.interface.getSighash(functionName)) {
          return true;
        }
      }

      return false;
    });

    selectors.contract = this.contract;
    selectors.remove = this.remove;
    selectors.get = this.get;

    return selectors;
  },

  removeSelectors: function (selectors, signatures) {
    const iface = new ethers.utils.Interface(signatures.map(v => 'function ' + v));
    const removeSelectors = signatures.map(v => iface.getSighash(v));
    selectors = selectors.filter(v => !removeSelectors.includes(v));

    return selectors;
  },

  findAddressPositionInFacets: function (facetAddress, facets) {
    for (let i = 0; i < facets.length; i++) {
      if (facets[i].facetAddress === facetAddress) {
        return i;
      }
    }
  }
}

module.exports = {
  DiamondHelper
}
