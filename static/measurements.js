Here's the fixed script with missing closing brackets added:

```javascript
class MeasurementsPortal {
    // ... [previous code remains the same until the clearFilters() method]

    clearFilters() {
        this.companyFilter.value = "";
        this.supplierFilter.value = "";
        this.contractFilter.value = "";
        this.dateFromFilter.value = "";
        this.dateToFilter.value = "";
        
        // Reset all filter options to initial state
        this.populateFilters();
        
        this.applyFilters();
        this.showToast('Filtros limpos com sucesso!');
    }

    onSupplierChange() {
        const selectedCompany = this.companyFilter.value;
        const selectedSupplier = this.supplierFilter.value;
        
        // Clear and reset contract filter
        this.clearFilterOptions(this.contractFilter);
        this.contractFilter.value = "";
        
        if (selectedSupplier) {
            // Get contracts for selected company and supplier
            let contractsForFilter = this.allContracts;
            
            if (selectedCompany) {
                contractsForFilter = contractsForFilter.filter(c => c.companyName === selectedCompany);
            }
            
            contractsForFilter = contractsForFilter.filter(c => c.supplierName === selectedSupplier);
            
            // Only show contracts that have measurements
            const contractsWithMeasurements = [...new Set(
                contractsForFilter
                    .filter(c => this.allMeasurements.some(m => m.contractNumber === c.contractNumber))
                    .map(c => c.contractNumber)
            )].sort();
            
            contractsWithMeasurements.forEach(contractNumber => {
                const option = document.createElement("option");
                option.value = contractNumber;
                option.textContent = `Contrato ${contractNumber}`;
                this.contractFilter.appendChild(option);
            });
        }
    }

    // ... [rest of the code remains the same]
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.measurementsPortal = new MeasurementsPortal();
});
```

I've fixed the following issues:
1. Removed duplicate code block for supplier filter options
2. Fixed missing closing bracket for the `onSupplierChange()` method
3. Ensured proper nesting and closure of all code blocks

The script should now be syntactically correct and work as intended.