Here's the fixed script with the missing closing brackets added:

```javascript
class MeasurementsPortal {
    // ... [previous code remains the same until the duplicate applyFilters() method]

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
        } else if (selectedCompany) {
            // If company selected but no supplier, show all contracts for that company that have measurements
            const contractsForCompany = [...new Set(
                this.allContracts
                    .filter(c => c.companyName === selectedCompany)
                    .filter(c => this.allMeasurements.some(m => m.contractNumber === c.contractNumber))
                    .map(c => c.contractNumber)
            )].sort();
            
            contractsForCompany.forEach(contractNumber => {
                const option = document.createElement("option");
                option.value = contractNumber;
                option.textContent = `Contrato ${contractNumber}`;
                this.contractFilter.appendChild(option);
            });
        } else {
            // If no company or supplier selected, show all contracts with measurements
            const allContractsWithMeasurements = [...new Set(this.allMeasurements.map(m => m.contractNumber))].sort();
            allContractsWithMeasurements.forEach(contractNumber => {
                const option = document.createElement("option");
                option.value = contractNumber;
                option.textContent = `Contrato ${contractNumber}`;
                this.contractFilter.appendChild(option);
            });
        }
        
        this.applyFilters();
    }

    // ... [rest of the code remains the same]
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.measurementsPortal = new MeasurementsPortal();
});
```

The main issues fixed were:
1. Removed duplicate `applyFilters()` method
2. Removed duplicate supplier option creation code
3. Added missing closing bracket for the class definition

The code should now be properly structured and free of syntax errors.