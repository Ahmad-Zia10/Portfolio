from PIL import Image, ImageOps, ImageFilter, ImageDraw
import numpy as np
INK=(11,11,12); BLUE=(44,68,255); YEL=(255,200,87)
PAL=np.array([INK,BLUE,YEL],dtype=np.uint8); LV=np.array([0.0,0.42,1.0])
src=Image.open('cut3.png').convert('RGBA')
# crop to portrait framing
src=src.crop((0,0,470,652))
alpha_full=np.array(src)[...,3]/255.0
g=ImageOps.grayscale(src.convert('RGB'))
g=ImageOps.autocontrast(g,cutoff=1)
g=np.array(g)/255.0
g=np.clip((g-0.08)/0.84,0,1)**0.85  # lift contrast

def to_img(idx,a,scale):
    rgb=PAL[idx]; A=(a>0.5).astype(np.uint8)*255
    im=Image.fromarray(np.dstack([rgb,A]),'RGBA')
    return im.resize((im.width*scale,im.height*scale),Image.NEAREST)

def small(p):
    w,h=470//p,652//p
    gs=np.array(Image.fromarray((g*255).astype(np.uint8)).resize((w,h),Image.LANCZOS))/255.0
    a=np.array(Image.fromarray((alpha_full*255).astype(np.uint8)).resize((w,h),Image.LANCZOS))/255.0
    return gs,a

def bayer(p):
    gs,a=small(p)
    B=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]])/16.0+1/32
    h,w=gs.shape; T=np.tile(B,(h//4+1,w//4+1))[:h,:w]
    idx=np.zeros_like(gs,dtype=int)
    lo=gs<LV[1]
    f=np.where(lo,gs/LV[1],(gs-LV[1])/(1-LV[1]))
    idx=np.where(lo,np.where(f>T,1,0),np.where(f>T,2,1))
    return to_img(idx,a,p*2)

def atkinson(p):
    gs,a=small(p); x=gs.copy(); h,w=x.shape; idx=np.zeros((h,w),int)
    for y in range(h):
        for i in range(w):
            o=x[y,i]; k=int(np.argmin(np.abs(LV-o))); idx[y,i]=k; e=(o-LV[k])/8
            for dy,dx in ((0,1),(0,2),(1,-1),(1,0),(1,1),(2,0)):
                yy,xx=y+dy,i+dx
                if 0<=yy<h and 0<=xx<w: x[yy,xx]+=e
    return to_img(idx,a,p*2)

def halftone(cell):
    S=2; W,H=470*S,652*S
    gs=np.array(Image.fromarray((g*255).astype(np.uint8)).resize((W,H),Image.LANCZOS))/255.0
    a=np.array(Image.fromarray((alpha_full*255).astype(np.uint8)).resize((W,H),Image.LANCZOS))/255.0
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    c=cell*S
    mask=Image.fromarray((a>0.5).astype(np.uint8)*255)
    base=Image.new('RGBA',(W,H),BLUE+(255,)); im=Image.composite(base,im,mask); d=ImageDraw.Draw(im)
    for yy in range(0,H,c):
        off=(c//2) if (yy//c)%2 else 0
        for xx in range(-c,W,c):
            cx,cy=xx+off+c//2,yy+c//2
            if not(0<=cx<W and 0<=cy<H) or a[cy,cx]<0.5: continue
            v=gs[cy,cx]
            if v<0.55:
                r=(1-v/0.55)**0.8*c*0.62
                d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=INK)
            else:
                r=((v-0.55)/0.45)**0.9*c*0.6
                if r>0.6: d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=YEL)
    return im

bayer(2).save('out/v1_bayer.png')
atkinson(2).save('out/v2_atkinson.png')
halftone(9).save('out/v3_halftone.png')
bayer(5).save('out/v1_bayer_coarse.png')
atkinson(1).save('out/v2_atkinson_fine.png')
# previews on blue
for n in ['v1_bayer','v2_atkinson','v3_halftone']:
    im=Image.open(f'out/{n}.png'); bg=Image.new('RGBA',im.size,BLUE+(255,)); bg.alpha_composite(im); bg.convert('RGB').save(f'out/{n}_prev.png')
print('ok')
