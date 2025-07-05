document.addEventListener("DOMContentLoaded", () => {
    let allContracts = [];

    const totalContractsCard = document.getElementById("totalContracts");
    const totalValueCard = document.getElementById("totalValue");
    const totalCompaniesCard = document.getElementById("totalCompanies");
    const totalSuppliersCard = document.getElementById("totalSuppliers");
    const contractsTableBody = document.querySelector("#contractsTable tbody");
    const statusFilter = document.getElementById("statusFilter");
    const companyFilter = document.getElementById("companyFilter");
    const supplierFilter = document.getElementById("supplierFilter");
    const contractNumberFilter = document.getElementById("contractNumberFilter");
    const clearFiltersButton = document.getElementById("clearFilters");

    async function fetchContracts() {
        try {
            const response = await fetch("/api/contracts");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allContracts = await response.json();
            populateFilters(allContracts);
            renderTable(allContracts);
            updateStats(allContracts);
        } catch (error) {
            console.error("Erro ao buscar contratos:", error);
            contractsTableBody.innerHTML = `<tr><td colspan="9">Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    function populateFilters(contracts) {
        const statuses = [...new Set(contracts.map(c => c.status))];
        statuses.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            statusFilter.appendChild(option);
        });

        const companies = [...new Set(contracts.map(c => c.companyName))];
        companies.forEach(company => {
            const option = document.createElement("option");
            option.value = company;
            option.textContent = company;
            companyFilter.appendChild(option);
        });

        const suppliers = [...new Set(contracts.map(c => c.supplierName))];
        suppliers.forEach(supplier => {
            const option = document.createElement("option");
            option.value = supplier;
            option.textContent = supplier;
            supplierFilter.appendChild(option);
        });
    }

    function renderTable(contracts) {
        contractsTableBody.innerHTML = "";
        if (contracts.length === 0) {
            contractsTableBody.innerHTML = `<tr><td colspan="9">Nenhum contrato encontrado com os filtros aplicados.</td></tr>`;
            return;
        }
        contracts.forEach(contract => {
            const row = contractsTableBody.insertRow();
            row.insertCell().textContent = contract.contractNumber;
            row.insertCell().textContent = contract.status;
            row.insertCell().textContent = contract.companyName;
            row.insertCell().textContent = contract.supplierName;
            row.insertCell().textContent = contract.endDate;
            
            // Calcular dias para vencimento
            const endDate = new Date(contract.endDate);
            const today = new Date();
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const diasCell = row.insertCell();
            if (diffDays > 0) {
                diasCell.textContent = `${diffDays} dias restantes`;
                diasCell.style.color = '#28a745'; // Verde para contratos não vencidos
            } else if (diffDays === 0) {
                diasCell.textContent = 'Vence hoje';
                diasCell.style.color = '#ffc107'; // Amarelo para vencimento hoje
            } else {
                diasCell.textContent = `${Math.abs(diffDays)} dias vencido`;
                diasCell.style.color = '#dc3545'; // Vermelho para contratos vencidos
            }
            
            row.insertCell().textContent = (parseFloat(contract.totalLaborValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            row.insertCell().textContent = (parseFloat(contract.totalMaterialValue) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            row.insertCell().textContent = (parseFloat(contract.valorTotal) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        });
    }

    function updateStats(contracts) {
        totalContractsCard.textContent = contracts.length;

        const totalValue = contracts.reduce((sum, c) => sum + (parseFloat(c.valorTotal) || 0), 0);
        totalValueCard.textContent = totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        const uniqueCompanies = new Set(contracts.map(c => c.companyName));
        totalCompaniesCard.textContent = uniqueCompanies.size;

        const uniqueSuppliers = new Set(contracts.map(c => c.supplierName));
        totalSuppliersCard.textContent = uniqueSuppliers.size;
    }

    function applyFilters() {
        const selectedStatus = statusFilter.value;
        const selectedCompany = companyFilter.value;
        const selectedSupplier = supplierFilter.value;
        const contractNumberText = contractNumberFilter.value.toLowerCase();

        let filteredContracts = allContracts.filter(contract => {
            const matchesStatus = selectedStatus ? contract.status === selectedStatus : true;
            const matchesCompany = selectedCompany ? contract.companyName === selectedCompany : true;
            const matchesSupplier = selectedSupplier ? contract.supplierName === selectedSupplier : true;
            const matchesContractNumber = contractNumberText ? contract.contractNumber.toLowerCase().includes(contractNumberText) : true;
            return matchesStatus && matchesCompany && matchesSupplier && matchesContractNumber;
        });

        renderTable(filteredContracts);
        updateStats(filteredContracts);
    }

    statusFilter.addEventListener("change", applyFilters);
    companyFilter.addEventListener("change", applyFilters);
    supplierFilter.addEventListener("change", applyFilters);
    contractNumberFilter.addEventListener("input", applyFilters);
    clearFiltersButton.addEventListener("click", () => {
        statusFilter.value = "";
        companyFilter.value = "";
        supplierFilter.value = "";
        contractNumberFilter.value = "";
        renderTable(allContracts);
        updateStats(allContracts);
    });

    fetchContracts();
});


