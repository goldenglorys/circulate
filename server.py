import os

from flask import Flask, jsonify, send_from_directory, request
import random
from collections import deque

app = Flask(__name__, static_folder="./client/build")


class LoadBalancer:
    def __init__(self, ips):
        self.ips = ips
        self.connections = {ip: 0 for ip in ips}
        self.round_robin = deque(ips)
        self.algorithm = "round_robin"

    def get_ip(self):
        if self.algorithm == "round_robin":
            ip = self.round_robin[0]
            self.round_robin.rotate(-1)
        elif self.algorithm == "random":
            ip = random.choice(self.ips)
        elif self.algorithm == "least_connections":
            ip = min(self.connections, key=self.connections.get)

        self.connections[ip] += 1
        return ip

    def get_stats(self):
        return self.connections

    def set_algorithm(self, algorithm):
        self.algorithm = algorithm

    def add_ip(self, ip):
        if ip not in self.ips:
            self.ips.append(ip)
            self.connections[ip] = 0
            self.round_robin.append(ip)


lb = LoadBalancer(
    [
        "95.77.48.211",
        "109.170.148.204",
        "76.223.137.165",
        "122.117.19.28",
        "45.223.197.37",
    ]
)


@app.route("/api/get_ip")
def get_ip():
    ip = lb.get_ip()
    return jsonify({"ip": ip, "message": "circulate", "stats": lb.get_stats()})


@app.route("/api/set_algorithm/<algorithm>")
def set_algorithm(algorithm):
    lb.set_algorithm(algorithm)
    return jsonify({"success": True})


@app.route("/api/add_ip", methods=["POST"])
def add_ip():
    data = request.json
    new_ip = data.get("ip")
    if new_ip:
        lb.add_ip(new_ip)
        return jsonify({"success": True, "message": f"Added {new_ip}"})
    return jsonify({"success": False, "message": "Invalid IP"})


if __name__ == "__main__":
    app.run(debug=True)
