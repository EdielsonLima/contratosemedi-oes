class MeasurementsPortal {
    constructor() {
        this.allMeasurements = [];
        this.allContracts = [];
        this.filteredMeasurements = [];
        
        this.initializeElements();
        this.loadData();
        this.setupEventListeners();
    }

    initializeElements() {
        this.companyFilter = document.getElementById("companyFilter");
        this.supplierFilter = document.getElementById("supplierFilter");
        this.contractFilter = document.getElementById("contractFilter");
        this.measurementsTable = document.getElementById("measurementsTable");
        this.measurementsBody = document.getElementById("measurementsBody");
    }

    async loadData() {
        try {
            const [measurementsResponse, contractsResponse] = await Promise.all([
                fetch('/api/measurements'),
                fetch('/api/contracts')
            ]);
            
            this.allMeasurements = await measurementsResponse.json();
            this.allContracts = await contractsResponse.json();
            this.filteredMeasurements = [...this.allMeasurements];
            
            this.populateFilters();
            this.renderMeasurements();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    populateFilters() {
        this.populateCompanyFilter();
        this.populateSupplierFilter();
        this.populateContractFilter();
    }

    populateCompanyFilter() {
        const companies = [...new Set(this.allContracts.map(c => c.companyName))].sort();
        companies.forEach(company => {
            const option = document.createElement("option");
            option.value = company;
            option.textContent = company;
            this.companyFilter.appendChild(option);
        });
    }

    populateSupplierFilter() {
        const suppliers = [...new Set(this.allContracts.map(c => c.supplierName))].sort();
        suppliers.forEach(supplier => {
            const option = document.createElement("option");
            option.value = supplier;
            option.textContent = supplier;
            this.supplierFilter.appendChild(option);
        });
    }

    populateContractFilter() {
        const contractsWithMeasurements = [...new Set(this.allMeasurements.map(m => m.contractNumber))].sort();
        contractsWithMeasurements.forEach(contractNumber => {
            const option = document.createElement("option");
            option.value = contractNumber;
            option.textContent = `Contrato ${contractNumber}`;
            this.contractFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        this.companyFilter.addEventListener("change", () => this.onCompanyChange());
        this.supplierFilter.addEventListener("change", () => this.onSupplierChange());
        this.contractFilter.addEventListener("change", () => this.applyFilters());
    }

    clearFilterOptions(selectElement) {
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }
    }

    onCompanyChange() {
        const selectedCompany = this.companyFilter.value;
        
        // Clear and reset supplier and contract filters
        this.clearFilterOptions(this.supplierFilter);
        this.clearFilterOptions(this.contractFilter);
        this.supplierFilter.value = "";
        this.contractFilter.value = "";
        
        if (selectedCompany) {
            // Get suppliers for selected company
            const suppliersForCompany = [...new Set(
                this.allContracts
                    .filter(c => c.companyName === selectedCompany)
                    .map(c => c.supplierName)
            )].sort();
            
            suppliersForCompany.forEach(supplier => {
                const option = document.createElement("option");
                option.value = supplier;
                option.textContent = supplier;
                this.supplierFilter.appendChild(option);
            });
            
            // Get contracts for selected company that have measurements
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
            // If no company selected, show all suppliers and contracts
            this.populateSupplierFilter();
            this.populateContractFilter();
        }
        
        this.applyFilters();
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

    applyFilters() {
        const selectedCompany = this.companyFilter.value;
        const selectedSupplier = this.supplierFilter.value;
        const selectedContract = this.contractFilter.value;
        
        this.filteredMeasurements = this.allMeasurements.filter(measurement => {
            const contract = this.allContracts.find(c => c.contractNumber === measurement.contractNumber);
            
            if (!contract) return false;
            
            if (selectedCompany && contract.companyName !== selectedCompany) return false;
            if (selectedSupplier && contract.supplierName !== selectedSupplier) return false;
            if (selectedContract && measurement.contractNumber !== selectedContract) return false;
            
            return true;
        });
        
        this.renderMeasurements();
    }

    renderMeasurements() {
        this.measurementsBody.innerHTML = "";
        
        this.filteredMeasurements.forEach(measurement => {
            const contract = this.allContracts.find(c => c.contractNumber === measurement.contractNumber);
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${contract ? contract.companyName : 'N/A'}</td>
                <td>${contract ? contract.supplierName : 'N/A'}</td>
                <td>${measurement.contractNumber}</td>
                <td>${measurement.measurementDate}</td>
                <td>${measurement.measurementValue}</td>
                <td>${measurement.measurementType}</td>
                <td>${measurement.status}</td>
            `;
            
            this.measurementsBody.appendChild(row);
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.measurementsPortal = new MeasurementsPortal();
});