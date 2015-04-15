import json


all_code = []
all_comm = {}
cur_com  = []

for i in open('c64rom_sc.txt').readlines():
    try:
        code = i[1] == ','
        addr = i[2:6]
        comm = i[32:-1].strip()

        if not addr.strip() and not comm.strip():
            continue

        if comm:
            cur_com.append(comm)

        if addr:
            a = int(addr, 16)
            if code:
                all_code.append(a)

            if cur_com:            
                all_comm[a] = '\n'.join(cur_com)
            cur_com = []

    except:
        pass


#print json.dumps({"code": all_code, "comments": all_comm})

x = json.load(open('../data.json'))
x['comments'] = all_comm
x['all_code'] = all_code
print json.dumps(x)
