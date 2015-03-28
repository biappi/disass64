function Segment(name, mem, base) {
    this.name = name;
    this.mem  = mem;
    this.base = base;
}

Segment.prototype.at = function(addr) {
    return this.mem[addr - this.base];
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

Segment.from_form = function (codeAddr) {
    var RAM  = [];

    var addr = 0;
    var data = document.disass.codefield.value;
    var lc   = '';
    var ofs  = 0;
    var mode = 1;

    data = data.toUpperCase();

    for (var i = 0; i < data.length; i++) {
        var c = data.charAt(i);

        if (mode == 2) {
            if ((c == '\r') || (c == '\n')) mode = 1;
        }
        else if (((c >= '0') && (c <= '9')) || ((c >= 'A') && (c <= 'F'))) {
            if (mode == 1) {
                if (lc) {
                    RAM[addr++] = parseInt(lc + c, 16);
                    if (addr>0xffff)
                        break;

                    lc = '';
                }
                else {
                    lc = c;
                }
            }
        }
        else if (c == ':') {
            mode = 0;
        }
        else if (c == ';') {
            mode = 2;
        }
        else {
            mode = 1;
        }
    }

    return new Segment('form', RAM, codeAddr);
}

