document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const fetchBtn = document.getElementById("fetchBtn");
    const devicesSelect = document.getElementById("devices");

    fetchBtn.addEventListener("click", () => {
        socket.emit("fetch_devices");
    });

    socket.on("devices_output", (data) => {
        devicesSelect.innerHTML = ""; // Limpa a lista anterior

        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        const devices = data.devices;
        if (devices.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No devices available";
            devicesSelect.appendChild(option);
        } else {
            devices.forEach((device) => {
                const option = document.createElement("option");
                option.value = device.id;
                option.textContent = device.name;
                devicesSelect.appendChild(option);
            });
        }
    });
});
