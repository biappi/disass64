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

// ------- //

function LineUint8(line, addr, rom) {
    this.line = line;
    this.addr = addr;
    this.size = 1;
    this.val  = rom.at(addr);
}

LineUint8.prototype.to_html = function() {
    return sprintf("%02X (%s)", this.val, String.fromCharCode(this.val));
}

function LineUint16(line, addr, rom) {
    this.line = line;
    this.addr = addr;
    this.size = 2;
    this.val  = rom.at(addr) + (rom.at(addr + 1) << 8);
}

LineUint16.prototype.to_html = function() {
    return sprintf("%04X", this.val);
}


function LineString(line, addr, rom, size) {
    this.line = line;
    this.addr = addr;
    this.size = size;
    this.val  = '';

    for (var i = 0; i < size; i++)
        this.val += String.fromCharCode(rom.at(this.addr + i));
}

LineString.prototype.to_html = function() {
    return this.val;
}

// ------ //

var fanculo;

function changeline(line, select) {
    conversions[select.value].doit(fanculo, line);
}

function Lines(rom, element) {
    fanculo = this;

    this.rom     = rom;
    this.lines   = [];
    this.element = element;

    for (var i = 0; i < rom.size(); i++) {
        this.lines.push(new LineUint8(
            i,
            rom.base + i,
            rom
        ));
    }

    this.render();
}

Lines.prototype.render = function() {
    var str = '';
    for (var i in this.lines) {
        var line = this.lines[i];
        line.line = i;
        str += render_line(line);
    }

    this.element.innerHTML = str;
}

Lines.prototype.fix_lines = function(linenr, newline) {
    var target_size     = newline.size;
    var to_delete_size  = 0;
    var to_delete_lines = 0;
    
    while (to_delete_size < target_size) {
        to_delete_size += this.lines[linenr + to_delete_lines].size;
        to_delete_lines++;
    }

    var padding = to_delete_size - target_size;

    var spliceparams = [
        linenr,
        to_delete_lines,
        newline
    ];

    var padding_addr_start = newline.addr + newline.size;
    for (var i = 0; i < padding; i++) {
        spliceparams.push(new LineUint8(linenr + i + 1, padding_addr_start + i, this.rom));
    }

    Array.prototype.splice.apply(this.lines, spliceparams);
    this.render();
}

Lines.prototype.to_uint8 = function(linenr) {
    var line = this.lines[linenr];
    if (line instanceof LineUint8)
        return;

    var newline = new LineUint8(linenr, line.addr, this.rom);
    this.fix_lines(linenr, newline)
}

Lines.prototype.to_uint16 = function(linenr) {
    var oldline = this.lines[linenr];
    if (oldline instanceof LineUint16)
        return;

    var newline = new LineUint16(linenr, oldline.addr, this.rom);
    this.fix_lines(linenr, newline)
}

Lines.prototype.to_string = function(linenr) {
    var oldline = this.lines[linenr];
    if (oldline instanceof LineString)
        return;

    if (this.lines[linenr - 1] instanceof LineString) {
        var oldstring = this.lines[linenr - 1];
        var newstring = new LineString(linenr - 1, oldstring.addr, this.rom, oldstring.size + 1);
        this.fix_lines(linenr - 1, newstring);
    }
    else {
        var newline = new LineString(linenr, oldline.addr, this.rom, 1);
        this.fix_lines(linenr, newline)
    }
}

var conversions = [
    {
        name: 'uint8',
        doit: function(lines, linenr) { lines.to_uint8(linenr); },
    },
    {
        name: 'uint16',
        doit: function(lines, linenr) { lines.to_uint16(linenr); },
    },
    {
        name: 'string',
        doit: function(lines, linenr) { lines.to_string(linenr); },
    }
];

function render_line(line) {
    all = sprintf("%04X  -  ", line.addr);
    all += '<select onchange="javascript:changeline(' + line.line + ', this)"><option></option>';

    for (var c in conversions) 
        all += "<option value='" + c + "'>" + conversions[c].name + "</option>";

    all += '</select>  -  ' + line.to_html() + '\n';

    return all;
}
