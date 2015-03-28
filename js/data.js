function Segment(name, mem, base) {
    this.name = name;
    this.mem  = mem;
    this.base = base;
}

Segment.prototype.at = function(addr) {
    return this.mem[addr - this.base];
}

Segment.prototype.size = function() {
    return this.mem.length;
}

Segment.from_file = function (name, filename, address) {
    var request = new XMLHttpRequest();
    request.responseType = "arraybuffer";
    request.open('GET', filename, false);
    request.send(null);

    return new Segment(
        name,
        new Uint8Array(request.response),
        address
    );
}
