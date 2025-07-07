Here's the fixed script with missing closing brackets added:

```javascript
class MeasurementsPortal {
    // [Previous code remains unchanged until the clearFilters() method]

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
        // [Previous onSupplierChange code]
        
        const allSuppliers = [...new Set(this.allContracts.map(c => c.supplierName))].sort();
        allSuppliers.forEach(supplier => {
            const option = document.createElement("option");
            option.value = supplier;
            option.textContent = supplier;
            this.supplierFilter.appendChild(option);
        });
    }

    applyFilters() {
        const selectedContract = this.contractFilter.value;
        const selectedCompany = this.companyFilter.value;
        const selectedSupplier = this.supplierFilter.value;
        const dateFrom = this.dateFromFilter.value;
        const dateTo = this.dateToFilter.value;

        this.filteredMeasurements = this.allMeasurements.filter(measurement => {
            const matchesContract = selectedContract ? measurement.contractNumber === selectedContract : true;
            const matchesCompany = selectedCompany ? measurement.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? measurement.supplierName === selectedSupplier : true;
            
            let matchesDateRange = true;
            if (dateFrom) {
                matchesDateRange = matchesDateRange && measurement.measurementDate >= dateFrom;
            }
            if (dateTo) {
                matchesDateRange = matchesDateRange && measurement.measurementDate <= dateTo;
            }
            
            return matchesContract && matchesCompany && matchesSupplier && matchesDateRange;
        });

        this.renderTable();
        this.updateStats();
    }

    // [Rest of the code remains unchanged]
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.measurementsPortal = new MeasurementsPortal();
});
```

The main issues fixed were:
1. Removed duplicate `applyFilters()` method
2. Fixed duplicate supplier filter population code
3. Properly closed all method blocks with `}`
4. Ensured proper nesting of methods within the class

The code should now be properly structured with all closing brackets in place.