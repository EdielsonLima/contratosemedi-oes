Here's the fixed script with all missing closing brackets added:

```javascript
class MeasurementsPortal {
    // [Previous code remains unchanged until the processMeasurements method]

    processMeasurements(measurements) {
        console.log('🔧 Processando medições da API...');
        
        return measurements.map((measurement, index) => {
            // [Previous code remains unchanged]
            
            return {
                id: measurement.id || index + 1,
                measurementNumber: String(measurement.measurementNumber || measurement.id || index + 1).padStart(3, '0'),
                contractId: measurement.contractId || measurement.supplyContractId,
                contractNumber: contractNumber,
                companyName: companyName,
                supplierName: supplierName,
                measurementDate: formattedDate.toISOString().split('T')[0],
                period: this.formatPeriod(formattedDate),
                type: 'MEDICAO',
                totalLaborValue: laborValue,
                totalMaterialValue: materialValue,
                totalValue: totalValue,
                retentionValue: retentionValue,
                liquidValue: liquidValue,
                description: measurement.description || measurement.note || `Medição ${measurement.measurementNumber || index + 1}`,
                createdAt: measurement.createdAt || measurementDate,
                updatedAt: measurement.updatedAt || measurementDate,
                originalData: measurement,
                hasValidContract: !!contract
            };
        });
    }

    // [Rest of the code remains unchanged]
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.measurementsPortal = new MeasurementsPortal();
});
```

The main issue was in the `processMeasurements` method where there were some duplicate code blocks and missing closing brackets. I've removed the duplicate code and added the missing closing brackets. The rest of the code remains functionally the same.