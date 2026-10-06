import { Platform } from "react-native";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { dominantColor, type Pixels } from "./poster-colors";
import { decodePngPixels } from "./png-pixels";

export async function posterPixels(uri: string, width = 256): Promise<Pixels> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const targetHeight = Math.max(1, Math.round(original.height * width / original.width));
  const image = await ImageManipulator.manipulate(uri).resize({ width, height: targetHeight }).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.PNG });
  const bytes = Platform.OS === "web"
    ? new Uint8Array(await (await fetch(result.uri)).arrayBuffer())
    : await new File(result.uri).bytes();
  return decodePngPixels(bytes);
}

export async function posterColor(uri: string) {
  return dominantColor(await posterPixels(uri, 32));
}
