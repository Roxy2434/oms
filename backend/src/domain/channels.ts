// Sales channel codes stored on orders → names shown to people (lists, filters, reports). Plain module: safe in client code.
export const channelNames:Record<string,string>={NHAP_TAY:'Nhập tay',WEBSITE:'Website',SHOPEE:'Shopee',TIKTOK:'TikTok',SHOPVUI:'ShopVui'};
export const channelCodes=Object.keys(channelNames);
export const channelName=(code:string)=>channelNames[code]??code;
