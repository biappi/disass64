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

function line_as_dict(line) {
    return {
        type: line.type,
        line: line.line,
        addr: line.addr,
        size: line.size,
        val:  line.val,
    };
}

// ------ //

function ListItem(item, prev, next) {
    this.item = item;
    this.prev = prev;
    this.next = next;
}

function list_append(list, item) {
    if (!list) {
        return new ListItem(item, null, null);
    }
    else {
        var list_item = new ListItem(item, list, null);

        if (list.next) {
            list.next.prev = list_item;
            list_item.next = list.next;
        }

        list.next = list_item;

        return list_item;
    }
}

function list_replace(list, item) {
    var x = new ListItem(item, list.prev, list.next);
    list.prev.next = x;
    list.next.prev = x;
    return x;
}

function list_foreach(list, f) {
    var it = list;
    while (it) {
        f(it);
        it = it.next;
    }
}

function list_replace(list, item) {
    var x = new ListItem(item, list.prev, list.next);
    list.prev.next = x;
    list.next.prev = x;

    return x;
}

function list_delete(list) {
    list.next.prev = list.prev;
    list.prev.next = list.next;

    return list.next;
}

// ------ //

function Names() {
    this.addresses_to_names = {};
    this.names_to_addresses = {};
}

Names.prototype.set = function(name, address) {
    if (name) {
        this.addresses_to_names[address] = name;
        this.names_to_addresses[name]    = address;
    }
    else {
        delete this.addresses_to_names[address];
        delete this.names_to_addresses[name];
    }
}

Names.prototype.save = function() {
    return {
        a2n: this.addresses_to_names,
        n2a: this.names_to_addresses,
    };
}

Names.prototype.load = function(j) {
    this.addresses_to_names = j.a2n;
    this.names_to_addresses = j.n2a;
}

Names.prototype.for_display = function(addr) {
    var name = this.addresses_to_names[addr];
    return name || sprintf('%04X', addr);
}

Names.prototype.name = function(addr) {
    var name = this.addresses_to_names[addr];
    return name || '';
}

// ------ //

function Lines(rom, element) {
    this.rom        = rom;
    this.lines_list = null;
    this.names      = new Names();
    this.element    = element;

    element.appendChild(document.createElement('table'));

    var iterator    = null;
    for (var i = 0; i < rom.size(); i++) {
        var line = linetypes.uint8.create(
            i,
            rom.base + i,
            rom
        );

        iterator = list_append(iterator, line);
        if (!this.lines_list) this.lines_list = iterator;
    }

    this.load();
    this.render();
}

Lines.prototype.load = function() {
    var xmlhttp = new XMLHttpRequest();

    var the_this = this;

    xmlhttp.onreadystatechange=function() {
        if (xmlhttp.readyState == 4) {
            var json  = xmlhttp.responseText;
            var saved = JSON.parse(json);
            var lines = saved.lines;
            var it    = null;

            the_this.lines_list = null;

            for (var i in lines) {
                it = list_append(it, lines[i]);
                if (!the_this.lines_list) the_this.lines_list = it;
            }

            the_this.names.load(saved.names);

            the_this.render();
        }
    }

    xmlhttp.open("GET", "data.json", true);
    xmlhttp.send();
}

Lines.prototype.save = function() {
    var all_lines = []
    list_foreach(
        this.lines_list,
        function (line_item) {
            all_lines.push(line_as_dict(line_item.item));
        }
    );

    var json = {
        lines: all_lines,
        names: this.names.save(),
    };

    return JSON.stringify(json);
}

Lines.prototype.render = function() {
    var str = [];
    
    var append_here = document.createElement('table');
    this.element.replaceChild(append_here, this.element.firstChild);

    var this_lines = this;

    list_foreach(
        this.lines_list,
        function (line_item) {
            line_item.item.element = render_lineitem(line_item, this_lines);
            append_here.appendChild(line_item.item.element);
        }
    );
}

Lines.prototype.fix_lines = function(line_item, newline) {
    var target_size   = newline.size;
    var deleted_size  = 0;
    var deleted_lines = 0;

    var deleting      = line_item;

    while (deleted_size < target_size) {
        deleted_size += deleting.item.size;
        deleting = list_delete(deleting);
        deleted_lines++;
    }

    var new_lineitem  = list_append(line_item.prev, newline);
    new_lineitem.item.element = render_lineitem(new_lineitem, this);

    var padding_addr  = newline.addr + newline.size;
    var padding_bytes = deleted_size - target_size;
    var pad_item      = new_lineitem;

    line_item.item.element.parentNode.insertBefore(new_lineitem.item.element, line_item.item.element);

    for (var i = 0; i < padding_bytes; i++) {
        var pad = linetypes.uint8.create(null, padding_addr + i, this.rom)
        pad_item = list_append(pad_item, pad);
        pad_item.item.element = render_lineitem(pad_item, this);
        line_item.item.element.parentNode.insertBefore(pad_item.item.element, line_item.item.element);
    }


    deleting = line_item.item.element;
    for (var i = 0; i < deleted_lines; i++) {
        var nextDeleting = deleting.nextSibling;
        deleting.parentNode.removeChild(deleting);
        deleting = nextDeleting;
    }
}

Lines.prototype.convert = function(line_item, newtype) {
    var line = line_item.item;

    if (line.type == newtype)
        return;

    if (newtype == 'string') {
        this.to_string(line_item);
        return;
    }

    var newline = linetypes[newtype].create(null, line.addr, this.rom);
    this.fix_lines(line_item, newline);
}

Lines.prototype.to_string = function(line_item) {
    var oldline = line_item.item;

    if (line_item.prev.item.type == 'string') {
        var oldstring = line_item.prev.item;
        var newstring = linetypes.string.create(null, oldstring.addr, this.rom, oldstring.size + 1);
        this.fix_lines(line_item.prev, newstring);
    }
    else {
        var newline = linetypes.string.create(null, oldline.addr, this.rom, 1);
        this.fix_lines(line_item, newline)
    }
}


function create_onclick(lines, lineitem, newtype) {
    return function() {
        lines.convert(lineitem, newtype);
    };
}

function render_lineitem(line_item, lines) {
    var element = document.createElement('tr');
    element.innerHTML = render_line(line_item.item, lines.names);

    var cb_names = element.getElementsByClassName('cb_name');
    var cb_names_onclick = function() {
        var name = prompt(sprintf('Name for address %04X', line_item.item.addr));
        lines.names.set(name, line_item.item.addr);

        var eles = document.getElementsByClassName(sprintf('ad_%04x', line_item.item.addr));
        for (var i = 0; i < eles.length; i++) {
            eles[i].innerHTML = lines.names.for_display(line_item.item.addr);
        }
    };

    for (var i = 0; i < cb_names.length; i++) {
        cb_names[i].onclick = cb_names_onclick;
    }

    for (var i in __conversions) {
        var c  = __conversions[i];
        var cb = 'cb_' + c;
        var el = element.getElementsByClassName(cb)[0];
        
        el.onclick = create_onclick(lines, line_item, c);
    }

    return element;
}


__conversions = Object.keys(linetypes);
__conversions.sort();
__conversions_options = '';
for (var c in __conversions)
    __conversions_options += "<a href='#' class='cb_" + __conversions[c] + "'>" + __conversions[c] + "</a> ";

function render_line(line, names) {
    var label = sprintf(
        "<a href='#' class='cb_name ad_%04x'>%s</a> ",
        line.addr,
        names.name(line.addr)
    );

    var addr = sprintf(
        "<a href='#' class='cb_name'>%04X</a> ",
        line.addr
    );

    return [
        '<td class="label">',
        label,
        '</td>',
        '<td class="addr">',
         addr,
        '</td>',
        '<td class="conversions">',
        __conversions_options,
        '</td>',
        '<td class="line">',
        linetypes[line.type].to_html(line),
        '</td>',
    ].join('');
}

