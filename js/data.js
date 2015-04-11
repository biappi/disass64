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

var linetypes = {
    uint8: {
        create: function(line, addr, rom) {
            return {
                type: 'uint8',
                line: line,
                addr: addr,
                size: 1,
                val:  rom.at(addr),
            };
        },
        to_html: function(thing) {
            return sprintf("%02X (%s)", thing.val, String.fromCharCode(thing.val));
        }
    },

    uint16: {
        create: function(line, addr, rom) {
            return {
                type: 'uint16',
                line: line,
                addr: addr,
                size: 2,
                val:  rom.at(addr) + (rom.at(addr + 1) << 8),
            }
        },
        to_html: function(thing) {
            return sprintf("%04X", thing.val);
        },
    },

    string: {
        create: function(line, addr, rom, size) {
            var val = ''
            for (var i = 0; i < size; i++)
                val += String.fromCharCode(rom.at(addr + i));

            return {
                type: 'string',
                line: line,
                addr: addr,
                size: size,
                val:  val,
            }
        },
        to_html: function(thing) {
            return thing.val;
        },
    },

};

// ------ //

var fanculo;

function changeline(line, select) {
    fanculo.convert(line, select.value);
}

function Lines(rom, element) {
    fanculo = this;

    this.rom     = rom;
    this.lines   = [];
    this.element = element;

    for (var i = 0; i < rom.size(); i++) {
        this.lines.push(linetypes.uint8.create(
            i,
            rom.base + i,
            rom
        ));
    }

    this.load();
    this.render();
}

Lines.prototype.load = function() {
    var xmlhttp = new XMLHttpRequest();

    var the_this = this;

    xmlhttp.onreadystatechange=function() {
        if (xmlhttp.readyState == 4) {
            var json = xmlhttp.responseText;
            the_this.lines = JSON.parse(json);
            the_this.render();
        }
    }

    xmlhttp.open("GET", "data.json", true);
    xmlhttp.send();
}

Lines.prototype.render = function() {
    var str = [];
    for (var i in this.lines) {
        var line = this.lines[i];
        line.line = i;
        str.push(render_line(line));
    }

    this.element.innerHTML = str.join('');

    var content = JSON.stringify(this.lines);
    document.getElementById('json').value = content;
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
        spliceparams.push(linetypes.uint8.create(linenr + i + 1, padding_addr_start + i, this.rom));
    }

    Array.prototype.splice.apply(this.lines, spliceparams);
    this.render();
}

Lines.prototype.convert = function(linenr, newtype) {
    var line = this.lines[linenr];
    if (line.type == newtype)
        return;

    if (newtype == 'string') {
        this.to_string(linenr);
        return;
    }

    var newline = linetypes[newtype].create(linenr, line.addr, this.rom);
    this.fix_lines(linenr, newline);
}

Lines.prototype.to_string = function(linenr) {
    var oldline = this.lines[linenr];

    if (this.lines[linenr - 1].type == 'string') {
        var oldstring = this.lines[linenr - 1];
        var newstring = linetypes.string.create(linenr - 1, oldstring.addr, this.rom, oldstring.size + 1);
        this.fix_lines(linenr - 1, newstring);
    }
    else {
        var newline = linetypes.string.create(linenr, oldline.addr, this.rom, 1);
        this.fix_lines(linenr, newline)
    }
}

__conversions = Object.keys(linetypes);
__conversions.sort();

function render_line(line) {
    all = sprintf("%04X  -  ", line.addr);
    all += '<select onchange="javascript:changeline(' + line.line + ', this)"><option></option>';

    if (!__conversions) {
    }

    for (var c in __conversions) 
        all += "<option>" + __conversions[c] + "</option>";

    all += '</select>  -  ' + linetypes[line.type].to_html(line) + '\n';

    return all;
}
